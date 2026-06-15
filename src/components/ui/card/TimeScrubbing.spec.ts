import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TimeScrubbing from './TimeScrubbing.vue'

describe('시간대 탐색 카드', () => {
  it('초기 고정 경계 시간인 00:00과 24:00을 렌더링해야 한다', async () => {
    const wrapper = mount(TimeScrubbing, {
      props: {
        modelValue: 12.0,
        'onUpdate:modelValue': (e: number) => wrapper.setProps({ modelValue: e }),
      },
    })

    // Check that boundary texts are initially present
    expect(wrapper.text()).toContain('00:00')
    expect(wrapper.text()).toContain('24:00')

    // Check that it formats time correctly
    expect(wrapper.text()).toContain('12:00')
  })

  it('시간 값이 시작 지점에 가까우면 00:00 표시를 흐리게 해야 한다', async () => {
    const wrapper = mount(TimeScrubbing, {
      props: {
        modelValue: 4.0,
      },
    })

    const spans = wrapper.findAll('span')
    const zeroZeroSpan = spans.find((span) => span.text() === '00:00')
    expect(zeroZeroSpan?.attributes('style')).toContain('opacity: 0.5')
  })

  it('시간 값이 끝 지점에 가까우면 24:00 표시를 흐리게 해야 한다', async () => {
    const wrapper = mount(TimeScrubbing, {
      props: {
        modelValue: 20.0,
      },
    })

    const spans = wrapper.findAll('span')
    const twentyFourSpan = spans.find((span) => span.text() === '24:00')
    expect(twentyFourSpan?.attributes('style')).toContain('opacity: 0.5')
  })

  it('리셋 버튼을 클릭하면 시간을 00:00으로 되돌려야 한다', async () => {
    const wrapper = mount(TimeScrubbing, {
      props: {
        modelValue: 12.0,
        'onUpdate:modelValue': (e: number) => wrapper.setProps({ modelValue: e }),
      },
    })

    const resetButton = wrapper.find('button[title="00:00으로 리셋"]')
    expect(resetButton.exists()).toBe(true)
    await resetButton.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([0])
  })

  it('뒤로 감기 버튼을 클릭하면 시간을 2시간 되돌려야 한다', async () => {
    const wrapper = mount(TimeScrubbing, {
      props: {
        modelValue: 12.0,
        'onUpdate:modelValue': (e: number) => wrapper.setProps({ modelValue: e }),
      },
    })

    const backwardButton = wrapper.find('button[title="2시간 뒤로 감기"]')
    expect(backwardButton.exists()).toBe(true)
    await backwardButton.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([10.0])
  })
})
