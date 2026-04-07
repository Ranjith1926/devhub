import { readFileSync } from 'fs';
import path from 'path';
import { createPublicKey, verify as verifyBytes } from 'crypto';

function parseArgs(argv) {
  const args = {
    publicKey: 'keys/license-public.pem',
    license: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--public-key') {
      args.publicKey = argv[i + 1];
      i += 1;
    } else if (arg === '--license') {
      args.license = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function usageAndExit() {
  console.error(
    [
      'Usage:',
      'node scripts/verify-license.mjs --license licenses/<id>.lic [--public-key keys/license-public.pem]',
    ].join('\n'),
  );
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.license) usageAndExit();

  const token = readFileSync(path.resolve(process.cwd(), args.license), 'utf8').trim();
  const [payloadB64, signatureB64] = token.split('.');
  if (!payloadB64 || !signatureB64) {
    throw new Error('Invalid token format. Expected base64url(payload).base64url(signature)');
  }

  const payloadBytes = Buffer.from(payloadB64, 'base64url');
  const signatureBytes = Buffer.from(signatureB64, 'base64url');
  const publicPem = readFileSync(path.resolve(process.cwd(), args.publicKey), 'utf8');
  const publicKey = createPublicKey(publicPem);

  const ok = verifyBytes(null, payloadBytes, publicKey, signatureBytes);
  if (!ok) {
    console.error('Signature INVALID');
    process.exit(2);
  }

  const payload = JSON.parse(payloadBytes.toString('utf8'));
  console.log('Signature valid');
  console.log(JSON.stringify(payload, null, 2));
}

main();
