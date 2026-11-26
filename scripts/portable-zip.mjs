import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

// A small ZIP32 writer for the hosting package, following PKWARE APPNOTE 6.3.10.
// Archive names use '/' on every operating system, including Windows PowerShell.
export function createZip(entries) {
  if (entries.length >= 0xffff) throw new Error('Hosting package exceeds the ZIP32 entry limit.');
  const local = [];
  const central = [];
  const names = new Set();
  let offset = 0;
  const now = new Date();
  const year = Math.max(1980, Math.min(2107, now.getFullYear()));
  const date = ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);

  for (const entry of entries) {
    const name = entry.name.replaceAll('\\', '/');
    const parts = name.replace(/\/$/, '').split('/');
    if (
      !name ||
      name.startsWith('/') ||
      parts.some((part) => !part || part === '.' || part === '..' || part.includes(':'))
    )
      throw new Error('Archive entries must have relative paths within the package.');
    if (names.has(name)) throw new Error(`Duplicate archive entry: ${name}`);
    names.add(name);
    const filename = Buffer.from(name, 'utf8');
    const directory = name.endsWith('/');
    const data = directory ? Buffer.alloc(0) : Buffer.from(entry.data);
    const method = data.length ? 8 : 0;
    const compressed = method === 8 ? deflateRawSync(data, { level: 9 }) : data;
    if (filename.length > 0xffff || data.length >= 0xffffffff || compressed.length >= 0xffffffff)
      throw new Error('Hosting package exceeds the ZIP32 entry size limit.');
    const checksum = crc32(data);

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6); // UTF-8 filenames.
    header.writeUInt16LE(method, 8);
    header.writeUInt16LE(time, 10);
    header.writeUInt16LE(date, 12);
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(filename.length, 26);
    local.push(header, filename, compressed);

    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE((3 << 8) | 20, 4); // Unix attributes for the Linux host.
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(0x0800, 8);
    record.writeUInt16LE(method, 10);
    record.writeUInt16LE(time, 12);
    record.writeUInt16LE(date, 14);
    record.writeUInt32LE(checksum, 16);
    record.writeUInt32LE(compressed.length, 20);
    record.writeUInt32LE(data.length, 24);
    record.writeUInt16LE(filename.length, 28);
    record.writeUInt32LE(
      (((directory ? 0o40755 : 0o100644) << 16) | (directory ? 0x10 : 0)) >>> 0,
      38,
    );
    record.writeUInt32LE(offset, 42);
    central.push(record, filename);
    offset += header.length + filename.length + compressed.length;
    if (offset >= 0xffffffff) throw new Error('Hosting package exceeds the ZIP32 size limit.');
  }

  const directory = Buffer.concat(central);
  if (directory.length >= 0xffffffff)
    throw new Error('Hosting package exceeds the ZIP32 size limit.');
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

export async function readZipEntries(directory, prefix = '') {
  const result = [];
  const children = await readdir(directory, { withFileTypes: true });
  for (const child of children.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const path = join(directory, child.name);
    const name = `${prefix}${child.name}`;
    if (child.isDirectory()) {
      result.push({ name: `${name}/`, data: Buffer.alloc(0) });
      result.push(...(await readZipEntries(path, `${name}/`)));
    } else if (child.isFile()) result.push({ name, data: await readFile(path) });
    else throw new Error(`Hosting package contains an unsupported file type: ${name}`);
  }
  return result;
}
