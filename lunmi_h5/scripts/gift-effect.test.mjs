import assert from 'node:assert/strict'
import test from 'node:test'
import {
  create_gift_video_object_url,
  gift_effect_kind,
  gift_effect_url,
  gift_video_yyeva_source,
  merge_gift_payload
} from '../src/utils/giftEffect.js'

test('classifies mp4 gift effects as video', () => {
  assert.equal(
    gift_effect_kind('https://cdn.example/gift/2057660460953501696.mp4'),
    'video'
  )
  assert.equal(
    gift_effect_kind('https://cdn.example/gift/2019619146735550464.svga'),
    'svga'
  )
})

test('prefers the mp4 or svga field over a thumbnail image', () => {
  assert.equal(
    gift_effect_url({
      amberIcon: 'https://cdn.example/gift/icon.jpg',
      gitfImgUrl: 'https://cdn.example/gift/2057660460953501696.mp4'
    }),
    'https://cdn.example/gift/2057660460953501696.mp4'
  )
  assert.equal(
    gift_effect_url({
      amberIcon: 'https://cdn.example/gift/2019619146735550464.svga',
      gitfImgUrl: 'https://cdn.example/gift/icon.png'
    }),
    'https://cdn.example/gift/2019619146735550464.svga'
  )
})

test('prefers a File instance as the YYEVA source', () => {
  const file = new File([new Uint8Array([0, 1, 2])], 'gift.mp4', { type: 'video/mp4' })
  assert.equal(
    gift_video_yyeva_source(file, 'https://cdn.example/gift.mp4'),
    file
  )
})

test('creates no blob url without a file', () => {
  assert.equal(create_gift_video_object_url(null), '')
})

test('merges catalog video urls onto a socket gift payload', () => {
  const merged = merge_gift_payload(
    {
      giftConfigId: '9',
      giftName: 'Rocket',
      giftImgUrl: 'https://cdn.example/gift/icon.png'
    },
    [{
      giftConfigId: '9',
      gitfName: 'Rocket',
      gitfImgUrl: 'https://cdn.example/gift/icon.png',
      amberIcon: 'https://cdn.example/gift/2057660460953501696.mp4'
    }]
  )
  assert.equal(merged.kind, 'video')
  assert.equal(merged.effectUrl, 'https://cdn.example/gift/2057660460953501696.mp4')
})
