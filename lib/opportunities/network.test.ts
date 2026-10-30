import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { projectNetwork, safeURL } from './network';
const firm = { id:'vc', name:'VC', status:'Published', source_url:'https://vc.example/', relationship_source:'https://yesyale.org/infrastructure', notes:'PRIVATE' };
const company = { id:'one', name:'One', website:'https://one.example/', source_url:'https://one.example/', status:'Published', notes:'PRIVATE', point_person_email:'private@example.com' };
const connection = { id:'vc-one', firm_id:'vc', startup_id:'one', type:'Portfolio', source_url:'https://vc.example/portfolio', status:'Published', notes:'PRIVATE' };
describe('member network projection', () => {
 it('merges the same company across investors and strips internal fields', () => {
  const data=projectNetwork({firms:[firm,{...firm,id:'other'}],startups:[company,{...company,id:'alias',website:'https://www.one.example/jobs'}],connections:[connection,{...connection,id:'other-one',firm_id:'other',startup_id:'alias'}]});
  expect(data.startups).toHaveLength(1); expect(data.connections).toHaveLength(2);
  expect(data.connections.map(c=>c.startup_id)).toEqual(['one','one']);
  expect(JSON.stringify(data)).not.toMatch(/PRIVATE|point_person|private@example/);
 });
 it('excludes drafts, dangling connections, missing evidence and ambiguous ids', () => {
  const data=projectNetwork({firms:[firm,{...firm,id:'hidden',status:'Draft'}],startups:[company,{...company,id:'dup'},{...company,id:'dup'}],connections:[{...connection,firm_id:'hidden'},{...connection,id:'no-source',source_url:''},{...connection,id:'duplicate-target',startup_id:'dup'}]});
  expect(data.connections).toEqual([]); expect(data.startups).toEqual([]);
 });
 it('requires evidence for direct relationships and never promotes portfolio links to direct', () => {
  const data=projectNetwork({firms:[firm],startups:[company],connections:[connection,{...connection,id:'direct',firm_id:'',type:'Direct'}]});
  expect(data.connections.map(c=>c.type)).toEqual(['Portfolio','Direct']);
 });
 it('rejects dangerous URLs and malformed payloads', () => {
  for(const value of ['javascript:alert(1)','data:text/html,bad','https://name:pass@example.com','//evil.com']) expect(safeURL(value)).toBe('');
  expect(safeURL('/vc/logo.svg',true)).toBe('/vc/logo.svg');
  expect(safeURL('/private/file.svg',true)).toBe('');
  expect(()=>projectNetwork({firms:[]})).toThrow();
 });
});
