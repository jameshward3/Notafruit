/**
 * Guide §3/§9: verify the actual foreground/background pairs the site uses.
 * Text ≥ 4.5:1; large text and meaningful graphics/UI boundaries ≥ 3:1.
 */
import { describe, expect, it } from 'vitest'
import { contrast, labelStyle, textOn } from '@/lib/contrast'
import { CATEGORY_META } from '@/lib/budget'
import { GROUP_STYLE } from '@/lib/projectStatus'

const T = {
  navy: '#0B2035', navyHover: '#163A5B', gold: '#B79B59', goldLight: '#EDE3CA', goldInk: '#70551F', white: '#FFFFFF',
  surface: '#F4F6F8', warm: '#F7F5F0', text: '#17283A', muted: '#526171', thead: '#E3E8EE', link: '#174F7A', focus: '#005FCC',
  controlBorder: '#718096', heroText: '#DCE3EA', mapBg: '#EEF1F4',
}

const TEXT_PAIRS: [string, string, string][] = [
  ['body text / white', T.text, T.white], ['body text / surface', T.text, T.surface], ['body text / warm', T.text, T.warm],
  ['muted / white', T.muted, T.white], ['muted / surface', T.muted, T.surface], ['muted / warm', T.muted, T.warm], ['muted / table head', T.muted, T.thead],
  ['link / white', T.link, T.white], ['link / surface', T.link, T.surface],
  ['gold ink / white', T.goldInk, T.white], ['navy / gold (featured button, current nav)', T.navy, T.gold], ['navy / gold light (sample flag)', T.navy, T.goldLight],
  ['white / navy', T.white, T.navy], ['white / navy hover', T.white, T.navyHover], ['gold eyebrow / navy', T.gold, T.navy], ['hero body / navy', T.heroText, T.navy],
  ['navy / North fill', T.navy, '#DCE8F2'], ['navy / South fill', T.navy, '#F3E7CA'], ['navy / East fill', T.navy, '#D9ECE8'], ['navy / West fill', T.navy, '#EADDE6'],
  ['success', '#24664E', '#E7F1EB'], ['warning', '#785A16', '#FFF3D6'], ['danger', '#A62D37', '#FBEAEC'], ['info', '#205B85', '#E8F1F8'],
  ['body text / warning bg', T.text, '#FFF3D6'], ['body text / danger bg', T.text, '#FBEAEC'], ['body text / info bg', T.text, '#E8F1F8'],
]

describe('text contrast ≥ 4.5:1', () => {
  for (const [name, fg, bg] of TEXT_PAIRS) {
    it(name, () => expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5))
  }
  it('chart segment labels meet 4.5:1, or 3:1 when rendered as large bold text', () => {
    for (const [k, m] of Object.entries(CATEGORY_META)) {
      const s = labelStyle(m.color)
      if (s.large) {
        expect(s.fontSize >= 18.66 && s.fontWeight >= 700, k).toBe(true)
        expect(s.ratio, k).toBeGreaterThanOrEqual(3)
      } else expect(s.ratio, k).toBeGreaterThanOrEqual(4.5)
    }
    // Documented exception: no text color reaches 4.5:1 on the guide's Parks color.
    expect(labelStyle(CATEGORY_META.parks_recreation.color).large).toBe(true)
    expect(contrast(textOn('#0B2035'), '#0B2035')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('non-text contrast ≥ 3:1', () => {
  it('focus ring and control borders on white', () => {
    expect(contrast(T.focus, T.white)).toBeGreaterThanOrEqual(3)
    expect(contrast(T.controlBorder, T.white)).toBeGreaterThanOrEqual(3)
    expect(contrast(T.gold, T.navy)).toBeGreaterThanOrEqual(3) // focus ring on navy
  })
  it('project status lines on the map canvas', () => {
    for (const [k, s] of Object.entries(GROUP_STYLE)) expect(contrast(s.color, T.mapBg), k).toBeGreaterThanOrEqual(3)
  })
  it('adjacent budget segments are separated by a white stroke, and each segment is distinguishable from white', () => {
    for (const [k, m] of Object.entries(CATEGORY_META)) if (k !== 'other') expect(contrast(m.color, T.white), k).toBeGreaterThanOrEqual(3)
  })
})
