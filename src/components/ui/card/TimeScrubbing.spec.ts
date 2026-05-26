import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TimeScrubbing from './TimeScrubbing.vue'

describe('TimeScrubbing.vue', () => {
  it('renders 00:00 and 24:00 initial static boundaries', async () => {
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

  it('fades out 00:00 when the time value is near the start', async () => {
    const wrapper = mount(TimeScrubbing, {
      props: {
        modelValue: 4.0,
      },
    })

    const spans = wrapper.findAll('span')
    const zeroZeroSpan = spans.find((span) => span.text() === '00:00')
    expect(zeroZeroSpan?.attributes('style')).toContain('opacity: 0.5')
  })

  it('fades out 24:00 when the time value is near the end', async () => {
    const wrapper = mount(TimeScrubbing, {
      props: {
        modelValue: 20.0,
      },
    })

    const spans = wrapper.findAll('span')
    const twentyFourSpan = spans.find((span) => span.text() === '24:00')
    expect(twentyFourSpan?.attributes('style')).toContain('opacity: 0.5')
  })

  it('resets time to 00:00 when reset button is clicked', async () => {
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

  it('rewinds time by 2 hours when skip backward button is clicked', async () => {
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
