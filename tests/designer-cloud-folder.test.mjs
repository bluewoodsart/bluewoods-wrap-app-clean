import test from 'node:test';
import assert from 'node:assert/strict';
import { getDesignerCloudFolderUrl } from '../src/lib/designerCloudFolder.ts';

test('missing folder never becomes a portal fallback', () => {
  for (const value of [null, undefined, '', '   ']) {
    assert.equal(getDesignerCloudFolderUrl(value), null);
  }
});

test('explicit external folder is preserved', () => {
  for (const url of ['https://drive.google.com/drive/folders/example', 'https://www.dropbox.com/scl/fo/example?rlkey=example']) {
    assert.equal(getDesignerCloudFolderUrl(` ${url} `), url);
  }
});

test('portal links are never cloud folders for either quote', () => {
  for (const path of ['proof/quote-a', 'proof/quote-b', 'designer/packet-a', 'customer-upload/upload-a', 'invoice/invoice-a', '%70roof/quote-b']) {
    assert.equal(getDesignerCloudFolderUrl(`https://www.slapwrapz.com/${path}`), null);
  }
});

test('invalid and executable URLs cannot become folder links', () => {
  for (const value of ['javascript:alert(1)', '/proof/example', '//example.com/folder', 'not a URL', 'https://user:password@example.com/folder']) {
    assert.equal(getDesignerCloudFolderUrl(value), null);
  }
});
