import assert from 'node:assert/strict'
import test from 'node:test'
import { resolve_post_media_url } from '../src/utils/postMediaStorage.js'

test('legacy participant photos use the verified HTTPS host and preserve the image path', async () => {
  assert.equal(
    await resolve_post_media_url('http://www.pumqewy2345.xyz/hfimg/img/avatar.jfif?size=80'),
    'https://www.pumqewy2345.xyz/hfimg/img/avatar.jfif?size=80'
  )
})

test('bundled avatars and other media keep their existing locations', async () => {
  for (const source of [
    '', '/static/logo.png',
    'https://www.pumqewy2345.xyz/hfimg/img/avatar.jfif',
    'https://media.example.test/upload%2Favatar.jpg',
    'http://0sc8fcvanc9gf8ckb40o.shop/api',
    'http://www.pumqewy2345.xyz.example.test/avatar.jpg',
    'http://www.pumqewy2345.xyz:8080/avatar.jpg'
  ]) assert.equal(await resolve_post_media_url(source), source)
  assert.equal(await resolve_post_media_url('indexeddb://old-avatar'), '')
})
