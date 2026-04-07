import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { createPrivateKey, sign as signBytes } from 'crypto';
import { randomUUID } from 'crypto';

function parseArgs(argv) {
  const args = {
    privateKey: 'keys/license-private.pem',
    out: '',
    id: '',
    email: '',
    plan: 'pro',
    maxDevices: 1,
    expiresAt: '',
    issuedAt: new Date().toISOString(),
    customerName: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--private-key') {
      args.privateKey = argv[i + 1];
      i += 1;
    } else if (arg === '--out') {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === '--id') {
      args.id = argv[i + 1];
      i += 1;
    } else if (arg === '--email') {
      args.email = argv[i + 1];
      i += 1;
    } else if (arg === '--plan') {
      args.plan = argv[i + 1];
      i += 1;
    } else if (arg === '--max-devices') {
      args.maxDevices = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--expires-at') {
      args.expiresAt = argv[i + 1];
      i += 1;
    } else if (arg === '--issued-at') {
      args.issuedAt = argv[i + 1];
      i += 1;
    } else if (arg === '--customer-name') {
      args.customerName = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function usageAndExit() {
  console.error(
    [
      'Usage:',
      'node scripts/create-license.mjs --email user@acme.com --expires-at 2027-12-31T23:59:59.000Z [options]',
      '',
      'Options:',
      '  --private-key <path>   Private key PEM path (default: keys/license-private.pem)',
      '  --out <path>           Output .lic path (default: licenses/<id>.lic)',
      '  --id <license-id>      License id (default: auto UUID)',
      '  --email <email>        Customer email (required)',
      '  --customer-name <name> Customer name (optional)',
      '  --plan <plan>          Plan name (default: pro)',
      '  --max-devices <n>      Max device activations (default: 1)',
      '  --expires-at <iso>     Expiry timestamp in ISO format (required)',
      '  --issued-at <iso>      Issued timestamp in ISO format (default: now)',
    ].join('\n'),
  );
  process.exit(1);
}

function isIsoDate(value) {
  return !Number.isNaN(Date.parse(value));
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeysDeep(value[key]);
    }
    return out;
  }
  return value;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email || !args.expiresAt) {
    usageAndExit();
  }
  if (!isIsoDate(args.expiresAt) || !isIsoDate(args.issuedAt)) {
    throw new Error('expires-at and issued-at must be valid ISO date strings.');
  }
  if (!Number.isFinite(args.maxDevices) || args.maxDevices < 1) {
    throw new Error('max-devices must be a number >= 1.');
  }

  const id = args.id || randomUUID();
  const payload = sortKeysDeep({
    customer_name: args.customerName || undefined,
    email: args.email,
    expires_at: new Date(args.expiresAt).toISOString(),
    id,
    issued_at: new Date(args.issuedAt).toISOString(),
    max_devices: Math.trunc(args.maxDevices),
    plan: args.plan,
  });

  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  }

  const payloadJson = JSON.stringify(payload);
  const privatePem = readFileSync(path.resolve(process.cwd(), args.privateKey), 'utf8');
  const privateKey = createPrivateKey(privatePem);
  const signature = signBytes(null, Buffer.from(payloadJson, 'utf8'), privateKey).toString(
    'base64url',
  );

  const token = `${Buffer.from(payloadJson, 'utf8').toString('base64url')}.${signature}`;

  const outPath = path.resolve(
    process.cwd(),
    args.out || path.join('licenses', `${id}.lic`),
  );
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, token, 'utf8');

  console.log(`License ID: ${id}`);
  console.log(`Written:    ${outPath}`);
  console.log('');
  console.log('Token format: base64url(payload).base64url(signature)');
}

main();
