import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import App from './App.vue'

describe('앱 루트', () => {
  it('대시보드 페이지를 렌더링해야 한다', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          DashboardPage: {
            template: '<main data-testid="dashboard-page" />',
          },
        },
      },
    })

    expect(wrapper.find('[data-testid="dashboard-page"]').exists()).toBe(true)
  })
})
