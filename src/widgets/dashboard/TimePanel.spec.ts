import { mount } from '@vue/test-utils'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { WORLD_LOCATIONS } from '@/features/scene/model/scene.constants'
import TimePanel from './TimePanel.vue'

describe('시간대 탐색 카드', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('초기 고정 경계 시간인 00:00과 24:00을 렌더링해야 한다', async () => {
    const wrapper = mount(TimePanel, {
      props: {
        modelValue: 12.0,
        'onUpdate:modelValue': (e: number) => wrapper.setProps({ modelValue: e }),
      },
    })

    // 고정 경계 시간이 화면에 표시되는지 확인합니다.
    expect(wrapper.text()).toContain('00:00')
    expect(wrapper.text()).toContain('24:00')

    // 현재 시간이 올바른 형식으로 표시되는지 확인합니다.
    expect(wrapper.text()).toContain('12:00')
  })

  it('시간 값이 시작 지점에 가까우면 00:00 표시를 흐리게 해야 한다', async () => {
    const wrapper = mount(TimePanel, {
      props: {
        modelValue: 4.0,
      },
    })

    const spans = wrapper.findAll('span')
    const zeroZeroSpan = spans.find((span) => span.text() === '00:00')
    expect(zeroZeroSpan?.attributes('style')).toContain('opacity: 0.5')
  })

  it('시간 값이 끝 지점에 가까우면 24:00 표시를 흐리게 해야 한다', async () => {
    const wrapper = mount(TimePanel, {
      props: {
        modelValue: 20.0,
      },
    })

    const spans = wrapper.findAll('span')
    const twentyFourSpan = spans.find((span) => span.text() === '24:00')
    expect(twentyFourSpan?.attributes('style')).toContain('opacity: 0.5')
  })

  it('리셋 버튼을 클릭하면 시간을 00:00으로 되돌려야 한다', async () => {
    const wrapper = mount(TimePanel, {
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

  it('현재 시간 버튼을 클릭하면 선택 도시의 현재 현지 시간으로 되돌려야 한다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-27T03:15:00.000Z'))
    const wrapper = mount(TimePanel, {
      props: {
        modelValue: 12.0,
        location: WORLD_LOCATIONS[2],
        'onUpdate:modelValue': (e: number) => wrapper.setProps({ modelValue: e }),
      },
    })

    const currentTimeButton = wrapper.find('button[title="현재 시간으로 리셋"]')
    expect(currentTimeButton.exists()).toBe(true)
    await currentTimeButton.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([12.3])
  })

  it('뒤로 감기 버튼을 클릭하면 시간을 2시간 되돌려야 한다', async () => {
    const wrapper = mount(TimePanel, {
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

  it('앞으로 감기 버튼을 클릭하면 시간을 2시간 앞으로 보내야 한다', async () => {
    const wrapper = mount(TimePanel, {
      props: {
        modelValue: 23.0,
        'onUpdate:modelValue': (e: number) => wrapper.setProps({ modelValue: e }),
      },
    })

    const forwardButton = wrapper.find('button[title="2시간 빨리 감기"]')
    expect(forwardButton.exists()).toBe(true)
    await forwardButton.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1.0])
  })

  it('시간 슬라이더를 조작하면 숫자 시간 값을 전달해야 한다', async () => {
    const wrapper = mount(TimePanel, {
      props: {
        modelValue: 12.0,
        'onUpdate:modelValue': (e: number) => wrapper.setProps({ modelValue: e }),
      },
    })

    const slider = wrapper.find('input[type="range"]')
    await slider.setValue('18.5')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([18.5])
  })

  it('재생 버튼을 클릭하면 시간이 자동으로 흐르고 다시 클릭하면 정지해야 한다', async () => {
    vi.useFakeTimers()

    const wrapper = mount(TimePanel, {
      props: {
        modelValue: 23.9,
        'onUpdate:modelValue': (e: number) => wrapper.setProps({ modelValue: e }),
      },
    })

    const playButton = wrapper.find('button[title="재생/일시정지"]')
    expect(playButton.text()).toContain('▶')

    await playButton.trigger('click')
    expect(playButton.text()).toContain('❚❚')

    vi.advanceTimersByTime(50)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([0])

    await playButton.trigger('click')
    expect(playButton.text()).toContain('▶')
  })

  it('재생 중 컴포넌트가 해제되면 타이머를 정리해야 한다', async () => {
    vi.useFakeTimers()

    const wrapper = mount(TimePanel, {
      props: {
        modelValue: 12.0,
        'onUpdate:modelValue': (e: number) => wrapper.setProps({ modelValue: e }),
      },
    })

    await wrapper.find('button[title="재생/일시정지"]').trigger('click')
    wrapper.unmount()

    vi.advanceTimersByTime(100)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('재생하지 않은 상태에서 컴포넌트가 해제되어도 안전해야 한다', () => {
    const wrapper = mount(TimePanel, {
      props: {
        modelValue: 12.0,
      },
    })

    expect(() => wrapper.unmount()).not.toThrow()
  })
})
