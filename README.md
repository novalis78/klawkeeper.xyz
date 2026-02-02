# KeyKeeper.world

*Secure email services powered by OpenPGP*

## Overview

KeyKeeper.world is a privacy-focused mail service designed as a companion to the SecureMailClient desktop application. It combines PGP encryption with disposable email addresses to provide a comprehensive security solution for privacy-conscious users.

## Core Features

### Key Management
- **PGP Key Generation and Storage**: Create and manage OpenPGP keys directly through the desktop client
- **Encrypted Key Backup**: Optional secure storage of encrypted master keys
- **Key Verification**: Email verification similar to keys.openpgp.org to maintain trust

### Disposable Email Addresses
- **On-Demand Email Creation**: Generate random addresses tied to your public key
- **Customizable Expiration**: Set time limits for temporary addresses
- **Automatic Forwarding**: Messages arrive securely at your main account

### Enhanced Privacy
- **Metadata Protection**: Minimize tracking through disposable addressing
- **End-to-End Encryption**: All internal communications fully encrypted
- **Minimal Data Retention**: Privacy-first policy for all user data

### Integration
- **SecureMailClient Compatible**: Seamless integration with our desktop application
- **YubiKey Support**: Hardware security through existing YubiKey integration
- **Works with Other Services**: Send encrypted mail to any provider

## Technical Implementation

Built using modern, auditable technologies:
- **Server**: Postfix/Dovecot mail server with custom PGP integration
- **Key Server**: Hagrid-based implementation (similar to keys.openpgp.org)
- **Frontend**: Minimal Next.js interface for account management
- **Security**: Open source codebase for transparency and community validation
- **Account Management**: Secure mail account creation with encrypted password storage
- **Mail Server Integration**: Support for various deployment options (Docker, direct, standard)

### Zero-Knowledge Architecture

KeyKeeper employs a true zero-knowledge architecture:

#### Server-Side (Everything Encrypted)
- All email content is stored fully encrypted on our servers
- Our systems only see encrypted data blobs, never plaintext content
- Your private key is never transmitted to or stored on our servers
- We only store your public key for verification and encryption
- Even email metadata is minimized and obscured where possible

#### Client-Side (Where Decryption Happens)
- Decryption occurs exclusively in your browser or desktop client
- Your private key remains on your device (or secured in your hardware key)
- Email content is decrypted only after secure transmission to your device
- Search functionality runs locally on decrypted content, not server-side
- Composition and replies are encrypted on your device before transmission

This architecture ensures that even if our servers were compromised, attackers would only access encrypted data they couldn't read. We simply cannot access your messages, even if compelled to do so.

## Why KeyKeeper?

Unlike traditional email providers, KeyKeeper.world:
- Requires no passwords (authentication via PGP)
- Generates truly anonymous addresses on demand
- Focuses on usability without sacrificing security
- Integrates with existing secure email workflows
- Provides the perfect companion to SecureMailClient's premium features

## Getting Started

1. Install the [SecureMailClient](https://securemailclient.com) desktop application
2. Upgrade to premium tier for KeyKeeper.world access
3. Generate your master PGP key (or import existing)
4. Start creating disposable addresses for enhanced privacy

## Premium Tier Benefits

- Unlimited disposable email addresses
- Encrypted key backup service
- Priority message routing
- Extended address lifetime options
- Advanced integration with SecureMailClient features

---

*KeyKeeper.world: Your keys, your mail, your privacy.*
