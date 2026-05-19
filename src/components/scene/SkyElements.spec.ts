import { describe, it, expect } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import SkyElements from './SkyElements.vue'

describe('SkyElements.vue', () => {
  // TresJS 컴포넌트들은 브라우저 환경(WebGL)이 필요하므로,
  // 단위 테스트에서는 실제 렌더링 대신 스텁(Stub)을 사용하여 구조와 로직만 검사합니다.
  const stubs = {
    TresMesh: {
      template: '<div class="tres-mesh-mock"><slot /></div>',
      // TresMesh가 ref로 참조될 때 제공할 속성들을 정의합니다.
      setup() {
        return {
          rotation: { x: 0, y: 0 },
        }
      },
    },
    // 간단한 컴포넌트들은 true로 설정하여 기본 스텁으로 대체합니다.
    TresBoxGeometry: true,
    TresMeshStandardMaterial: true,
    TresAmbientLight: true,
    TresDirectionalLight: true,
  }

  it('renders a TresMesh with box geometry and correct props', () => {
    // mount를 통해 컴포넌트를 메모리상에 렌더링합니다.
    const wrapper = mount(SkyElements, {
      global: { stubs },
    })

    // TresMesh 테스트
    expect(wrapper.find('.tres-mesh-mock').exists()).toBe(true)

    // TresBoxGeometry 테스트
    const boxGeometry = wrapper.find('tres-box-geometry-stub')
    expect(boxGeometry.exists()).toBe(true)
    expect(boxGeometry.attributes('args')).toBe('1,1,1')

    // TresMeshStandardMaterial 테스트
    const material = wrapper.find('tres-mesh-standard-material-stub')
    expect(material.exists()).toBe(true)
    expect(material.attributes('color')).toBe('#ffffff')
    expect(material.attributes('roughness')).toBe('0.5')
    expect(material.attributes('metalness')).toBe('0.75')
  })

  it('renders lighting elements with correct intensity', () => {
    const wrapper = mount(SkyElements, {
      global: { stubs },
    })

    // TresAmbientLight 테스트
    const ambientLight = wrapper.find('tres-ambient-light-stub')
    expect(ambientLight.exists()).toBe(true)
    expect(ambientLight.attributes('intensity')).toBe('0.75')

    // TresDirectionalLight 테스트
    const directionalLight = wrapper.find('tres-directional-light-stub')
    expect(directionalLight.exists()).toBe(true)
    expect(directionalLight.attributes('intensity')).toBe('1')
    expect(directionalLight.attributes('position')).toBe('5,5,5')
  })

  it('updates rotation on before-render event', async () => {
    const wrapper = mount(SkyElements, {
      global: { stubs },
    })

    // TresMesh 스텁 인스턴스를 가져옵니다.
    // getComponent는 컴포넌트의 VueWrapper를 반환합니다.
    const mesh = wrapper.getComponent('.tres-mesh-mock') as VueWrapper<any>

    // 초기 회전값(0) 확인
    expect(mesh.vm.rotation.x).toBe(0)
    expect(mesh.vm.rotation.y).toBe(0)

    // 'before-render' 이벤트를 수동으로 발생시켜 애니메이션 함수(onBeforeRender)를 실행합니다.
    await mesh.vm.$emit('before-render')

    // 회전값 업데이트 검증 (x는 0.005, y는 0.001만큼 증가해야 합니다.)
    expect(mesh.vm.rotation.x).toBeCloseTo(0.005)
    expect(mesh.vm.rotation.y).toBeCloseTo(0.001)

    // 한 번 더 실행하여 값이 누적되는지 확인
    await mesh.vm.$emit('before-render')
    expect(mesh.vm.rotation.x).toBeCloseTo(0.01)
    expect(mesh.vm.rotation.y).toBeCloseTo(0.002)
  })

  it('handles before-render when boxRef is not yet set (branch coverage)', async () => {
    const wrapper = mount(SkyElements, {
      global: {
        stubs: {
          ...stubs,
          TresMesh: {
            template: '<div class="tres-mesh-mock"><slot /></div>',
            setup(props, { emit }) {
              // 컴포넌트가 부모에게 전달되기 전(Ref 바인딩 전)에 이벤트를 발생시켜
              // 'if (boxRef.value)'가 false인 경우를 실행하게 만듭니다.
              emit('before-render')
              return {
                rotation: { x: 0, y: 0 },
              }
            },
          },
        },
      },
    })

    // 컴포넌트가 정상적으로 렌더링되었는지 확인
    expect(wrapper.exists()).toBe(true)
  })
})
