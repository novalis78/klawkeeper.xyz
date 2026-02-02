never push .env or .env.local files
never drop tables
git add,commit, push often for incremental checkpoints

## Deployment

Trigger Coolify deployment directly (no need for empty commits):
```bash
curl -X GET "http://107.170.27.222:8000/api/v1/deploy?uuid=qkg4okk4wk084g0cgs4g8co8&force=false" \
  -H "Authorization: Bearer 2|KiZcwJEyw2hap35PNde1yQllC49O3u6OTaWWbhkMb5026341"
```

Coolify dashboard: http://107.170.27.222:8000
Docs: https://coolify.io/docs/api-reference/api/operations/deploy-by-tag-or-uuid

## Environment

This machine runs:
- MySQL database (local)
- Postfix/Dovecot mail server
- Coolify deployment system
- The keykeeper.world codebase

## Key Architecture Notes

### PGP Key System
- Every user gets a PGP keypair generated during signup (`/signup/key-setup` → `pgpUtils.generateKey()`)
- Public key stored in `users.public_key` column in database
- Private key stays client-side only (browser storage or YubiKey)
- Outgoing emails auto-attach user's public key as `public_key.asc` (if available)
- API: `/api/user/public-key` returns current user's public key from DB

### Mail System
- Uses ImapFlow for IMAP, Nodemailer for SMTP
- Mail credentials stored in `virtual_users` table (Dovecot format with `{PLAIN}` prefix)
- Password lookup: `passwordManager.getPrimaryMailAccount(userId)` returns mail account with password
- Folder names vary by server - use `findActualFolderName()` to resolve (Sent, INBOX.Sent, etc.)
- ImapFlow returns flags as `Set` not `Array` - use `.has()` not `.includes()`

### Frontend Components
- `EmailRow` expects `message` prop (not `email`)
- `EmailDetail` expects `onBack` prop (not `onClose`)
- Both support `onReply`/`onForward` callbacks that open ComposeEmail modal

### Database Tables
- `users` - user accounts with PGP keys (public_key, fingerprint, key_id)
- `virtual_users` - mail server accounts (email, password with {PLAIN} prefix)
- `public_keys` - contacts' public keys for encryption

## Future UI Enhancements (Next-Gen Email UX Ideas)

### Compose Window Improvements
- Draggable floating window that can be positioned anywhere
- Multiple compose windows with tabbed interface
- Full-screen mode option
- Smooth spring animations for open/close/minimize

### Smart Recipient Features
- Recipient chips with Gravatar avatars
- Autocomplete dropdown with contact search
- Keyboard navigation (arrow keys, Enter to select)
- Valid/invalid email indicators (green/red borders)
- Quick remove with X button on each chip

### Rich Text Editor
- Floating toolbar on text selection
- Bold, italic, underline, strikethrough
- Bullet/numbered lists
- Link insertion with preview
- Code blocks with syntax highlighting
- Emoji picker
- @ mentions for contacts

### Smart Features
- AI-powered subject line suggestions
- Quick reply templates ("Thanks!", "Got it", "Will do")
- Scheduled send with calendar picker
- Undo send (5-second grace period)
- Auto-save drafts every 30 seconds

### Attachment Enhancements
- Image thumbnails preview
- PDF first page preview
- File icons by type
- Animated drag & drop zone
- Upload progress bars

### Quoted Text Improvements
- Collapsible quoted text (show first 2 lines)
- Smooth accordion animation
- Gradient fade when collapsed
- "Show quoted text" link (Gmail-style)
- Different background color for distinction

### Keyboard Shortcuts
- Cmd/Ctrl + Enter: Send
- Cmd/Ctrl + Shift + C: Toggle Cc/Bcc
- Esc: Minimize window
- Tab: Navigate through fields

### Polish & Micro-interactions
- Subtle scale on button hover
- Ripple effect on send button
- Success animation (checkmark bounce)
- Skeleton loading states
- Smooth color transitions
- Glassmorphism effects on modal backdrop