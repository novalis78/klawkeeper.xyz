/**
 * Email Templates with Color Palettes
 * Inspired by popular editor colorschemes
 */

export const EMAIL_TEMPLATES = {
  default: {
    id: 'default',
    name: 'KeyKeeper Classic',
    description: 'Clean and professional',
    colors: {
      background: '#ffffff',
      text: '#333333',
      accent: '#2b7de9',
      headerBg: '#f8f9fa',
      headerText: '#333333',
      footerBg: '#f8f9fa',
      footerText: '#888888',
      border: '#eeeeee',
      link: '#2b7de9'
    }
  },

  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark and elegant',
    colors: {
      background: '#1a1b26',
      text: '#a9b1d6',
      accent: '#7aa2f7',
      headerBg: '#16161e',
      headerText: '#c0caf5',
      footerBg: '#16161e',
      footerText: '#565f89',
      border: '#292e42',
      link: '#7dcfff'
    }
  },

  dracula: {
    id: 'dracula',
    name: 'Dracula',
    description: 'Dark with vibrant accents',
    colors: {
      background: '#282a36',
      text: '#f8f8f2',
      accent: '#bd93f9',
      headerBg: '#21222c',
      headerText: '#f8f8f2',
      footerBg: '#21222c',
      footerText: '#6272a4',
      border: '#44475a',
      link: '#8be9fd'
    }
  },

  nord: {
    id: 'nord',
    name: 'Nord',
    description: 'Arctic and minimalist',
    colors: {
      background: '#2e3440',
      text: '#eceff4',
      accent: '#88c0d0',
      headerBg: '#3b4252',
      headerText: '#eceff4',
      footerBg: '#3b4252',
      footerText: '#4c566a',
      border: '#4c566a',
      link: '#81a1c1'
    }
  },

  solarized: {
    id: 'solarized',
    name: 'Solarized Light',
    description: 'Easy on the eyes',
    colors: {
      background: '#fdf6e3',
      text: '#657b83',
      accent: '#268bd2',
      headerBg: '#eee8d5',
      headerText: '#073642',
      footerBg: '#eee8d5',
      footerText: '#93a1a1',
      border: '#eee8d5',
      link: '#268bd2'
    }
  },

  gruvbox: {
    id: 'gruvbox',
    name: 'Gruvbox',
    description: 'Retro and warm',
    colors: {
      background: '#282828',
      text: '#ebdbb2',
      accent: '#fe8019',
      headerBg: '#1d2021',
      headerText: '#ebdbb2',
      footerBg: '#1d2021',
      footerText: '#928374',
      border: '#3c3836',
      link: '#83a598'
    }
  },

  monokai: {
    id: 'monokai',
    name: 'Monokai',
    description: 'Classic dark theme',
    colors: {
      background: '#272822',
      text: '#f8f8f2',
      accent: '#a6e22e',
      headerBg: '#1e1f1c',
      headerText: '#f8f8f2',
      footerBg: '#1e1f1c',
      footerText: '#75715e',
      border: '#3e3d32',
      link: '#66d9ef'
    }
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calm and serene',
    colors: {
      background: '#ffffff',
      text: '#1e3a5f',
      accent: '#0077b6',
      headerBg: '#e8f4f8',
      headerText: '#0077b6',
      footerBg: '#e8f4f8',
      footerText: '#5a9fc0',
      border: '#cae9f5',
      link: '#0096c7'
    }
  },

  rose: {
    id: 'rose',
    name: 'Rose Pine',
    description: 'Soft and natural',
    colors: {
      background: '#191724',
      text: '#e0def4',
      accent: '#eb6f92',
      headerBg: '#1f1d2e',
      headerText: '#e0def4',
      footerBg: '#1f1d2e',
      footerText: '#6e6a86',
      border: '#26233a',
      link: '#c4a7e7'
    }
  },

  plain: {
    id: 'plain',
    name: 'Plain Text',
    description: 'No formatting, just text',
    isPlainText: true,
    colors: null
  }
};

/**
 * Generate HTML email from template
 */
export function generateEmailHTML(template, { subject, body, senderName, senderEmail }) {
  const t = EMAIL_TEMPLATES[template] || EMAIL_TEMPLATES.default;

  // Handle plain text template
  if (t.isPlainText) {
    return null; // Signal to use plain text instead
  }

  const c = t.colors;

  // Escape HTML special chars to prevent XSS
  const escapeHtml = (text) => {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Convert plain text to HTML paragraphs
  const textToHtml = (text) => {
    if (!text) return '';
    return escapeHtml(text)
      .replace(/\n{2,}/g, '</p><p style="margin: 0 0 15px; text-align: left;">')
      .replace(/\n/g, '<br>');
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="${isLightTheme(c.background) ? 'light' : 'dark'}">
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; background-color: ${c.background}; color: ${c.text};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${c.background};">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background-color: ${c.headerBg}; padding: 24px 30px; border-radius: 8px 8px 0 0; border-bottom: 1px solid ${c.border};">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: ${c.headerText}; text-align: left;">${escapeHtml(subject)}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: ${c.background}; padding: 30px; border-left: 1px solid ${c.border}; border-right: 1px solid ${c.border};">
              <p style="margin: 0 0 15px; text-align: left; color: ${c.text}; font-size: 15px;">${textToHtml(body)}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${c.footerBg}; padding: 20px 30px; border-radius: 0 0 8px 8px; border-top: 1px solid ${c.border}; border-left: 1px solid ${c.border}; border-right: 1px solid ${c.border}; border-bottom: 1px solid ${c.border};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: left;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: ${c.footerText};">
                      <strong style="color: ${c.accent};">KeyKeeper</strong> Secure Email
                    </p>
                    <p style="margin: 0 0 4px; font-size: 12px; color: ${c.footerText};">
                      Sent by ${escapeHtml(senderName)} &lt;${senderEmail}&gt;
                    </p>
                    <p style="margin: 0; font-size: 11px; color: ${c.footerText};">
                      Sent securely with <a href="https://keykeeper.world" style="color: ${c.link}; text-decoration: none;">KeyKeeper</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Check if a color is light or dark
 */
function isLightTheme(bgColor) {
  // Convert hex to RGB
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5;
}

/**
 * Get template preview colors for the settings UI
 */
export function getTemplatePreviewColors(templateId) {
  const t = EMAIL_TEMPLATES[templateId];
  if (!t || t.isPlainText) {
    return {
      bg: '#ffffff',
      text: '#333333',
      accent: '#666666'
    };
  }
  return {
    bg: t.colors.background,
    text: t.colors.text,
    accent: t.colors.accent
  };
}

/**
 * Get all templates as an array for UI display
 */
export function getAllTemplates() {
  return Object.values(EMAIL_TEMPLATES);
}
