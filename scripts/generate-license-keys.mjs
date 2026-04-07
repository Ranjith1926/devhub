import { generateKeyPairSync } from 'crypto';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

function parseArgs(argv) {
  const args = {
    outDir: 'keys',
    force: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out-dir') {
      args.outDir = argv[i + 1];
      i += 1;
    } else if (arg === '--force') {
      args.force = true;
    }
  }

  return args;
}

function ensureCanWrite(filePath, force) {
  if (!force && existsSync(filePath)) {
    throw new Error(`File already exists: ${filePath}. Use --force to overwrite.`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(process.cwd(), args.outDir);
  const privatePath = path.join(outDir, 'license-private.pem');
  const publicPath = path.join(outDir, 'license-public.pem');

  mkdirSync(outDir, { recursive: true });
  ensureCanWrite(privatePath, args.force);
  ensureCanWrite(publicPath, args.force);

  const { publicKey, privateKey } = generateKeyPairSync('ed25519');

  writeFileSync(
    privatePath,
    privateKey.export({ type: 'pkcs8', format: 'pem' }),
    'utf8',
  );
  writeFileSync(
    publicPath,
    publicKey.export({ type: 'spki', format: 'pem' }),
    'utf8',
  );

  console.log(`Private key: ${privatePath}`);
  console.log(`Public key:  ${publicPath}`);
  console.log('Keep the private key on your server only.');
}

main();
