// 获取offset值
export function getOffset(currentNode: HTMLElement, endNode = document.body, offset?: any): { top: number; left: number } {
    if (!offset) {
        offset = {}
        offset.top = 0
        offset.left = 0
    }

    if (currentNode === endNode) {
        return offset
    }

    offset.top += currentNode.offsetTop
    offset.left += currentNode.offsetLeft
    return getOffset(currentNode.offsetParent as HTMLElement, endNode, offset)
}

/**
 * 获取dom当前的样式
 * @param  {object} dom
 * @param  {string} attr 属性
 * @return
 */
export function getCurrentStyle(dom: HTMLElement, attr: string): string {
    return window.getComputedStyle(dom, null)[attr as any]
}

export const isEventSupportPassive = (() => {
    let passiveSupported: boolean | null = null
    return () => {
        if (passiveSupported !== null) {
            return passiveSupported
        }

        passiveSupported = false
        try {
            const options: any = Object.defineProperty({}, 'passive', {
                    get() {
                        passiveSupported = true
                    },
                })
                // tslint:disable-next-line:align
            ; (window as any).addEventListener('test', null, options)
        } catch (err) {
            // err
        }
        return passiveSupported
    }
})()

type CommonFunction = (...args: any[]) => any

export function debounce(fn: CommonFunction, delay = 1500) {
    let timer: any
    return (...args: any[]) => {
        clearTimeout(timer)
        timer = setTimeout(() => {
            fn(...args)
        }, delay)
    }
}
