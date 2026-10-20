import test from 'node:test'
import assert from 'node:assert/strict'
import { computed } from 'vue'
import { AGREEMENTS } from '../src/config/agreements.js'
import { t, set_app_language } from '../src/utils/i18n.js'
import { read_agreement_consent, write_agreement_consent } from '../src/utils/agreementConsent.js'
import en from '../src/locales/en.json' with { type: 'json' }
import ja from '../src/locales/ja.json' with { type: 'json' }

const storage = new Map()
globalThis.uni = {
  getStorageSync: (key) => storage.get(key),
  setStorageSync: (key, value) => storage.set(key, value)
}

test('all three complete legal documents switch language without a refetch or reload', () => {
  const visible = computed(() => Object.values(AGREEMENTS).map((document) => ({
    title: t(document.title),
    sections: document.sections.map((section) => ({ title: t(section.title), content: t(section.content) }))
  })))
  set_app_language('en')
  const english = visible.value
  assert.deepEqual(english.map((document) => document.sections.length), [13, 15, 15])
  set_app_language('ja')
  const japanese = visible.value
  for (const [index, document] of Object.values(AGREEMENTS).entries()) {
    assert.equal(japanese[index].sections.length, english[index].sections.length)
    for (const [section_index, section] of document.sections.entries()) {
      assert.equal(en[section.title], section.title)
      assert.equal(en[section.content], section.content)
      assert.ok(ja[section.title]?.trim(), section.title)
      assert.ok(ja[section.content]?.trim(), section.title)
      assert.equal(japanese[index].sections[section_index].content, ja[section.content])
      assert.notEqual(japanese[index].sections[section_index].content, section.content)
      assert.deepEqual(
        ja[section.content].match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g) || [],
        section.content.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g) || []
      )
    }
  }
  set_app_language('en')
  assert.deepEqual(visible.value, english)
})

test('legal copy preserves the adult age, optional coin rules, abuse reporting and appeal rights', () => {
  for (const document of Object.values(AGREEMENTS)) {
    const english = document.sections.map((section) => section.content).join('\n')
    const japanese = document.sections.map((section) => ja[section.content]).join('\n')
    assert.match(english, /18/)
    assert.match(japanese, /18歳/)
    assert.doesNotMatch(english, /17 or older|17 years|safety@lunmi|privacy@lunmi|support@lunmi/)
    assert.match(english, /lunmi_user@gmail\.com/)
  }
  for (const document of [AGREEMENTS.user, AGREEMENTS.eula]) {
    const english = document.sections.map((section) => section.content).join('\n')
    assert.match(english, /Coins do not unlock/i)
    assert.match(english, /24 hours/)
    assert.match(english, /Moderation Appeal/)
    assert.match(english, /100 Coins/)
    assert.match(english, /300 Coins/)
  }
})

test('old short-form acceptance does not silently accept the replacement legal documents', () => {
  storage.set('lunmi.agreement_consent', { version: 1, accepted: true })
  assert.equal(read_agreement_consent(), false)
  assert.equal(write_agreement_consent(true), true)
  assert.equal(read_agreement_consent(), true)
  set_app_language('ja')
  assert.equal(read_agreement_consent(), true)
  assert.equal(write_agreement_consent(false), true)
  assert.equal(read_agreement_consent(), false)
})
