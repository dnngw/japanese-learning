import { describe, expect, it } from 'vitest'
import { parseAss, parseSrt, parseSubtitle, parseVtt } from '../src/main/services/subtitleService.js'

describe('subtitle parsing', () => {
  it('parses SRT with tags, multi-line cues and CRLF', () => {
    const srt = '1\r\n00:00:01,500 --> 00:00:03,000\r\n<i>こんにちは</i>\r\n\r\n2\r\n00:01:02,050 --> 00:01:04,000\r\n{\\an8}元気ですか。\r\nはい！\r\n'
    expect(parseSrt(srt)).toEqual([
      { startMs: 1500, endMs: 3000, text: 'こんにちは' },
      { startMs: 62050, endMs: 64000, text: '元気ですか。 はい！' },
    ])
  })

  it('parses WebVTT including short timestamps', () => {
    const vtt = 'WEBVTT\n\nNOTE comment\n\n00:05.000 --> 00:07.250\n今日は\n\n1\n01:00:00.000 --> 01:00:01.000 align:start\n雨です'
    expect(parseVtt(vtt)).toEqual([
      { startMs: 5000, endMs: 7250, text: '今日は' },
      { startMs: 3600000, endMs: 3601000, text: '雨です' },
    ])
  })

  it('parses ASS dialogue, strips override tags and drops duplicate layers', () => {
    const ass = `[Script Info]
Title: test

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:02.00,0:00:04.50,Default,,0,0,0,,{\\b1}行こう、\\N早く！
Dialogue: 1,0:00:02.00,0:00:04.50,Default,,0,0,0,,{\\b1}行こう、\\N早く！
Comment: 0,0:00:05.00,0:00:06.00,Default,,0,0,0,,メモ
Dialogue: 0,0:00:01.00,0:00:01.90,Default,,0,0,0,,え、そう？`
    expect(parseAss(ass)).toEqual([
      { startMs: 1000, endMs: 1900, text: 'え、そう？' },
      { startMs: 2000, endMs: 4500, text: '行こう、 早く！' },
    ])
  })

  it('detects the format from the file name', () => {
    expect(parseSubtitle('ep01.ASS', '')?.kind).toBe('ass')
    expect(parseSubtitle('song.txt', 'x')).toBeNull()
  })
})
