import { createHash } from 'crypto';
import { Response } from 'express';

export function HTMLRedirection(url) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;URL='${url}'" />
      </head>
      <body></body>
    </html>
  `;
}

export function SHA256B64(msg: string) {
  return createHash('sha256').update(msg).digest('base64');
}
