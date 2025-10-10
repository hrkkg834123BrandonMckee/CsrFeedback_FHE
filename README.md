# CsrFeedback_FHE

A privacy-first FHE-powered platform for anonymous employee feedback on corporate social responsibility (CSR) initiatives. Employees can submit encrypted feedback, and management can view aggregated insights without accessing individual responses.

## Project Overview

Traditional CSR feedback systems often struggle with:

* Fear of retaliation, leading to biased or suppressed responses.
* Centralized control of feedback data, creating trust issues.
* Lack of verifiable aggregation methods for sensitive survey data.

CsrFeedback_FHE addresses these challenges by:

* Encrypting all survey responses before submission.
* Aggregating feedback using fully homomorphic encryption (FHE) without decrypting individual responses.
* Providing management with verifiable aggregate statistics while maintaining employee anonymity.

## Features

### Core Functionality

* **Encrypted Feedback Submission**: Employees submit encrypted ratings and comments.
* **FHE Aggregation**: On-chain aggregation of survey responses without revealing individual answers.
* **Anonymous Access**: Employees interact with the system without linking their identity to submissions.
* **Real-Time Insights**: Management views encrypted aggregate results immediately.

### Privacy & Anonymity

* **Client-Side Encryption**: Responses encrypted locally before submission.
* **Immutable Records**: Feedback stored on-chain cannot be altered.
* **Encrypted Computation**: Aggregate calculations are done on encrypted data.
* **Zero-Knowledge Access**: Managers only see aggregated results, preserving anonymity.

## Architecture

### Smart Contracts

CsrFeedbackFHE.sol (deployed on Ethereum)

* **FeedbackManager**: Handles submission of encrypted responses.
* **Aggregator**: Computes encrypted aggregate results.
* **AuditTrail**: Maintains encrypted logs for verification.

### Frontend Application

* **React + TypeScript**: Provides interactive and responsive UI for employees and management.
* **FHE Client Library**: Handles local encryption of feedback.
* **Ethers.js**: Facilitates blockchain interaction.
* **Real-Time Dashboard**: Displays encrypted aggregate results and trends.

## Technology Stack

### Blockchain

* Solidity ^0.8.24: Smart contract development
* OpenZeppelin: Security and standard contract libraries
* Hardhat: Testing and deployment framework
* Ethereum Testnet: Current development environment

### Frontend

* React 18 + TypeScript: Modern interactive UI
* Tailwind CSS: Responsive styling
* Ethers.js: Blockchain interaction
* FHE JS Libraries: Client-side encryption and proof generation

## Installation

### Prerequisites

* Node.js 18+ environment
* npm / yarn / pnpm package manager
* Ethereum wallet (MetaMask, WalletConnect, etc.)

### Setup

1. Clone the repository.
2. Install dependencies: `npm install` or `yarn install`
3. Deploy smart contracts to testnet.
4. Launch frontend with `npm start`.

## Usage

* **Submit Feedback**: Employees provide encrypted ratings and comments.
* **View Aggregates**: Management sees encrypted aggregate results.
* **Filter & Analyze**: Explore trends and CSR impact securely.

## Security Features

* End-to-end encryption of feedback
* Immutable on-chain storage
* Homomorphic computation for secure aggregation
* Zero-knowledge verification for management

## Future Enhancements

* Support multi-question CSR surveys with encrypted scoring
* Threshold-based alerts for CSR issues
* Multi-chain deployment for scalability
* Mobile application for secure feedback submission
* DAO-driven CSR improvement processes

Built with FHE to ensure privacy, security, and trustworthy evaluation of corporate social responsibility initiatives.
