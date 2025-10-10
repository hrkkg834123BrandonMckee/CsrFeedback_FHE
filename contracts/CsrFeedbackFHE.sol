// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract CsrFeedbackFHE is SepoliaConfig {
    struct EncryptedFeedback {
        uint256 feedbackId;
        euint32 encryptedScore; // Encrypted CSR score
        euint32 encryptedComment; // Encrypted comment or rating
        uint256 timestamp;
    }

    struct DecryptedFeedback {
        string score;
        string comment;
        bool isRevealed;
    }

    uint256 public feedbackCount;
    mapping(uint256 => EncryptedFeedback) public encryptedFeedbacks;
    mapping(uint256 => DecryptedFeedback) public decryptedFeedbacks;

    mapping(string => euint32) private encryptedScoreCounts;
    string[] private feedbackList;

    mapping(uint256 => uint256) private requestToFeedbackId;

    event FeedbackSubmitted(uint256 indexed feedbackId, uint256 timestamp);
    event DecryptionRequested(uint256 indexed feedbackId);
    event FeedbackDecrypted(uint256 indexed feedbackId);

    modifier onlyEmployee(uint256 feedbackId) {
        _;
    }

    /// @notice Submit a new encrypted feedback
    function submitEncryptedFeedback(
        euint32 encryptedScore,
        euint32 encryptedComment
    ) public {
        feedbackCount += 1;
        uint256 newFeedbackId = feedbackCount;

        encryptedFeedbacks[newFeedbackId] = EncryptedFeedback({
            feedbackId: newFeedbackId,
            encryptedScore: encryptedScore,
            encryptedComment: encryptedComment,
            timestamp: block.timestamp
        });

        decryptedFeedbacks[newFeedbackId] = DecryptedFeedback({
            score: "",
            comment: "",
            isRevealed: false
        });

        emit FeedbackSubmitted(newFeedbackId, block.timestamp);
    }

    /// @notice Request decryption of feedback
    function requestFeedbackDecryption(uint256 feedbackId) public onlyEmployee(feedbackId) {
        EncryptedFeedback storage feedback = encryptedFeedbacks[feedbackId];
        require(!decryptedFeedbacks[feedbackId].isRevealed, "Already decrypted");

        bytes32[] memory ciphertexts = new bytes32[](2);
        ciphertexts[0] = FHE.toBytes32(feedback.encryptedScore);
        ciphertexts[1] = FHE.toBytes32(feedback.encryptedComment);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptFeedback.selector);
        requestToFeedbackId[reqId] = feedbackId;

        emit DecryptionRequested(feedbackId);
    }

    /// @notice Callback for decrypted feedback
    function decryptFeedback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 feedbackId = requestToFeedbackId[requestId];
        require(feedbackId != 0, "Invalid request");

        EncryptedFeedback storage eFeedback = encryptedFeedbacks[feedbackId];
        DecryptedFeedback storage dFeedback = decryptedFeedbacks[feedbackId];
        require(!dFeedback.isRevealed, "Already decrypted");

        FHE.checkSignatures(requestId, cleartexts, proof);

        string[] memory results = abi.decode(cleartexts, (string[]));
        dFeedback.score = results[0];
        dFeedback.comment = results[1];
        dFeedback.isRevealed = true;

        if (!FHE.isInitialized(encryptedScoreCounts[results[0]])) {
            encryptedScoreCounts[results[0]] = FHE.asEuint32(0);
            feedbackList.push(results[0]);
        }
        encryptedScoreCounts[results[0]] = FHE.add(
            encryptedScoreCounts[results[0]],
            FHE.asEuint32(1)
        );

        emit FeedbackDecrypted(feedbackId);
    }

    /// @notice Get decrypted feedback info
    function getDecryptedFeedback(uint256 feedbackId) public view returns (
        string memory score,
        string memory comment,
        bool isRevealed
    ) {
        DecryptedFeedback storage f = decryptedFeedbacks[feedbackId];
        return (f.score, f.comment, f.isRevealed);
    }

    /// @notice Get encrypted score count
    function getEncryptedScoreCount(string memory score) public view returns (euint32) {
        return encryptedScoreCounts[score];
    }

    /// @notice Request decryption of score count
    function requestScoreCountDecryption(string memory score) public {
        euint32 count = encryptedScoreCounts[score];
        require(FHE.isInitialized(count), "Score not found");

        bytes32[] memory ciphertexts = new bytes32[](1);
        ciphertexts[0] = FHE.toBytes32(count);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptScoreCount.selector);
        requestToFeedbackId[reqId] = bytes32ToUint(keccak256(abi.encodePacked(score)));
    }

    /// @notice Callback for decrypted score count
    function decryptScoreCount(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 scoreHash = requestToFeedbackId[requestId];
        string memory score = getScoreFromHash(scoreHash);

        FHE.checkSignatures(requestId, cleartexts, proof);

        uint32 count = abi.decode(cleartexts, (uint32));
        // Handle decrypted count as needed
    }

    function bytes32ToUint(bytes32 b) private pure returns (uint256) {
        return uint256(b);
    }

    function getScoreFromHash(uint256 hash) private view returns (string memory) {
        for (uint i = 0; i < feedbackList.length; i++) {
            if (bytes32ToUint(keccak256(abi.encodePacked(feedbackList[i]))) == hash) {
                return feedbackList[i];
            }
        }
        revert("Score not found");
    }
}