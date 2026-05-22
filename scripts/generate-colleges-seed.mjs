import { readFile, writeFile } from 'node:fs/promises';

const colleges = JSON.parse(await readFile(new URL('../data/colleges.json', import.meta.url), 'utf8'));

const values = colleges
  .map((college) => {
    const name = String(college.college_name).replace(/'/g, "''");
    const district = String(college.district).replace(/'/g, "''");
    return `  (${college.id}, '${name}', '${district}')`;
  })
  .join(',\n');

const sql = `INSERT OR IGNORE INTO colleges_list (id, college_name, district) VALUES\n${values};\n`;

await writeFile(new URL('../seed/colleges.sql', import.meta.url), sql);
console.log('Generated seed/colleges.sql');
