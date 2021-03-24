/**
 * shop当前使用的版本，支持事件透传
 */

import { getOffset, getCurrentStyle, isEventSupportPassive, debounce } from './utils'
// import testxxxxxxxxx from './test'
import {SignatureConfig}from './type'


// interface SignatureConfig {
//     brushColor?: string
//     brushWidth?: number
//     imageType?: string
//     // 最外层元素
//     wrapperEl: HTMLElement
//     // 用于旋转的包裹元素
//     transformEl: HTMLElement
//     // canvas容器
//     canvasContainerEl: HTMLElement

//     event?: any
// }

const p = new Promise((resolve, reject) => {
    // setTimeout(() => {
    resolve(11)
    // }, 1000)
})

// 直接获取页面signature-wrapper的宽高，注意是横屏还是竖屏
export default class HandwrittenSignature {
    p = async () => {
        await p
    }
    // testxxxxxxxxx = testxxxxxxxxx()
    portraitCanvasContext!: CanvasRenderingContext2D
    landscapeCanvasContext!: CanvasRenderingContext2D
    isEventSupportPassive = isEventSupportPassive()
    private brushColor?: string
    private brushWidth?: number
    private wrapperEl!: HTMLElement
    private transformEl!: HTMLElement
    private canvasContainerEl!: HTMLElement
    private wrapperSize!: { width: number; height: number }
    private activeCanvas!: HTMLCanvasElement
    private imageType!: string
    private event!: any
    private boundaryRecorder!: {
        get(): {
            minY: number
            maxY: number
            minX: number
            maxX: number
        }
        record(axis: Axis): void
    }
    // async test() {
    //     await p
    // }

    constructor({
        brushColor,
        brushWidth,
        canvasContainerEl,
        wrapperEl,
        transformEl,
        event,
        imageType = 'image/jpeg',
    }: SignatureConfig) {
        this.wrapperEl = wrapperEl
        this.transformEl = transformEl
        this.canvasContainerEl = canvasContainerEl
        this.brushColor = brushColor
        this.brushWidth = brushWidth
        this.event = event || {}

        this.imageType = imageType
        this.boundaryRecorder = createBoundaryRecorder()

        this.fixPositionStyle(wrapperEl)

        this.fixPositionStyle(canvasContainerEl)

        this.initTransformElStyle()

        this.wrapperSize = this.getOutermostContainerSize()

        this.portraitCanvasContext = this.createCanvasContext(document.body)

        this.landscapeCanvasContext = this.createCanvasContext(this.canvasContainerEl)

        this.adjustByScreenStatus()

        this.assignCanvasStyle()

        this.addCanvasGestureEvent()

        // window.addEventListener("onorientationchange" in window ? "orientationchange" : "resize", hengshuping, false);
        window.addEventListener(
            'resize',
            debounce(() => {
                const wrapperSize = this.getOutermostContainerSize()

                const isSizeChanged =
                    wrapperSize.width !== this.wrapperSize.width || wrapperSize.height !== this.wrapperSize.height

                if (isSizeChanged) {
                    this.wrapperSize = wrapperSize
                }

                // 全屏触发，改变横竖屏也出发。因为固定宽度布局，所以手机端点击全屏需自行触发改变一次内容大小改变。
                this.adjustByScreenStatus()

                if (isSizeChanged) {
                    // 修正canvas
                    this.assignCanvasStyle()
                }
            }, 25)
        )
    }

    // 横屏 ，portrait竖屏
    isLandscape() {
        return window.orientation === 90 || window.orientation === -90
    }

    getOutermostContainerSize() {
        const { clientHeight, clientWidth } = this.wrapperEl
        return { width: clientWidth, height: clientHeight }
    }
    // portraitCanvas，landscapeCanvas
    createCanvasContext(containerEl: HTMLElement) {
        // 创建一个
        const canvasEl = document.createElement('canvas')

        const canvasContext = canvasEl.getContext('2d')

        // 确保canvas不影响布局
        canvasEl.style.display = 'none'

        containerEl.appendChild(canvasEl)

        return canvasContext as CanvasRenderingContext2D
    }

    assignCanvasContextStyle() {
        const { portraitCanvasContext, landscapeCanvasContext } = this

        landscapeCanvasContext.lineWidth = this.brushWidth || 2
        landscapeCanvasContext.strokeStyle = this.brushColor || '#000000'

        portraitCanvasContext.lineWidth = this.brushWidth || 2
        portraitCanvasContext.strokeStyle = this.brushColor || '#000000'
    }

    fixPositionStyle(el: HTMLElement) {
        if (getCurrentStyle(el, 'position') === 'static') {
            el.style.position = 'relative'
        }
    }

    assignCanvasStyle() {
        const { portraitCanvasContext, landscapeCanvasContext, canvasContainerEl } = this

        const { clientWidth: width, clientHeight: height } = canvasContainerEl

        const portraitCanvas = portraitCanvasContext.canvas
        const landscapeCanvas = landscapeCanvasContext.canvas
        const isLandscape = this.isLandscape()

        portraitCanvas.width = height
        landscapeCanvas.width = width

        portraitCanvas.height = width

        landscapeCanvas.height = height

        const { left, top } = getOffset(canvasContainerEl)

        landscapeCanvas.setAttribute(
            'style',
            `display:${isLandscape ? 'block' : 'none'};position:absolute;left:0px;top:0px;z-index:999`
        )

        portraitCanvas.setAttribute(
            'style',
            `display:${isLandscape ? 'none' : 'block'};position:absolute;left:${top}px;top:${
                left - this.wrapperSize.width
            }px;z-index:999`
        )
        const sizeChange = this.event.sizeChange

        sizeChange && sizeChange({ width, height })
        // 必须放在assignCanvasStyle里面执行(因为设置canvas宽高会重置画笔样式)
        this.assignCanvasContextStyle()
    }

    addCanvasGestureEvent() {
        const { portraitCanvasContext, landscapeCanvasContext } = this

        //  passive -> false会阻止默认事件
        const opts = this.isEventSupportPassive ? { passive: false, capture: false } : false

        const { touchstart, touchmove, touchend, touchcancel } = this.event
        const addTouchStart = (canvasCtx: CanvasRenderingContext2D, callback: any) => {
            canvasCtx.canvas.addEventListener(
                'touchstart',
                (evt: TouchEvent) => {
                    touchStart(evt, canvasCtx, callback)
                    // return false
                },
                opts
            )
        }
        const addTouchMove = (canvasCtx: CanvasRenderingContext2D, callback: any) => {
            canvasCtx.canvas.addEventListener(
                'touchmove',
                (evt: TouchEvent) => {
                    touchMove(evt, canvasCtx, () => this.boundaryRecorder, callback)
                    // return false
                },
                opts
            )
        }
        const passEvent = (
            canvasCtx: CanvasRenderingContext2D,
            eventName: 'touchend' | 'touchcancel',
            callback: any
        ) => {
            canvasCtx.canvas.addEventListener(
                eventName,
                (evt: TouchEvent) => {
                    const oEvent = evt || event
                    callback(oEvent.timeStamp)
                },
                opts
            )
        }
        addTouchStart(portraitCanvasContext, (axis: Axis, timeStamp: any) => {
            // 竖屏转换坐标系
            touchstart &&
                touchstart(
                    {
                        x: axis.y,
                        y: portraitCanvasContext.canvas.width - axis.x,
                    },
                    timeStamp
                )
        })
        addTouchStart(landscapeCanvasContext, (axis: Axis, timeStamp: any) => {
            // 横屏直接透传坐标
            touchstart && touchstart(axis, timeStamp)
        })
        addTouchMove(portraitCanvasContext, (axis: Axis, timeStamp: any) => {
            // 竖屏转换坐标系
            touchmove &&
                touchmove(
                    {
                        x: axis.y,
                        y: portraitCanvasContext.canvas.width - axis.x,
                    },
                    timeStamp
                )
        })
        addTouchMove(landscapeCanvasContext, (axis: Axis, timeStamp: any) => {
            // 横屏直接透传坐标
            touchmove && touchmove(axis, timeStamp)
        })

        passEvent(landscapeCanvasContext, 'touchend', (timeStamp: number) => {
            touchend && touchend(timeStamp)
        })
        passEvent(portraitCanvasContext, 'touchend', (timeStamp: number) => {
            touchend && touchend(timeStamp)
        })
        passEvent(landscapeCanvasContext, 'touchcancel', (timeStamp: number) => {
            touchcancel && touchcancel(timeStamp)
        })
        passEvent(portraitCanvasContext, 'touchcancel', (timeStamp: number) => {
            touchcancel && touchcancel(timeStamp)
        })
    }

    clearCanvas() {
        const { portraitCanvasContext, landscapeCanvasContext } = this
        const { width, height } = this.activeCanvas
        portraitCanvasContext.clearRect(0, 0, width, height)
        landscapeCanvasContext.clearRect(0, 0, width, height)
        this.boundaryRecorder = createBoundaryRecorder()
    }

    initTransformElStyle() {
        const transformEl = this.transformEl
        transformEl.style.transformOrigin = '0 0'
        transformEl.style.webkitTransformOrigin = '0 0'
        transformEl.style.position = 'absolute'
    }

    adjustByScreenStatus() {
        const { portraitCanvasContext, landscapeCanvasContext, transformEl } = this

        const portraitCanvas = portraitCanvasContext.canvas
        const landscapeCanvas = landscapeCanvasContext.canvas

        const { width, height } = this.wrapperSize

        let transformElWidth: number
        let transformElHeight: number
        let transformElLeft: number
        let transformElRotate: string

        if (this.isLandscape()) {
            // 横屏
            landscapeCanvas.style.display = 'block'
            portraitCanvas.style.display = 'none'

            if (this.activeCanvas !== landscapeCanvas) {
                this.activeCanvas = landscapeCanvas
                // 切换canvas需清除
                this.clearCanvas()
            }

            transformElWidth = width
            transformElHeight = height
            transformElLeft = 0
            transformElRotate = 'rotate(0deg)'
        } else {
            // 竖屏
            landscapeCanvas.style.display = 'none'
            portraitCanvas.style.display = 'block'

            if (this.activeCanvas !== portraitCanvas) {
                this.activeCanvas = portraitCanvas
                // 切换canvas需清除
                this.clearCanvas()
            }
            transformElWidth = height
            transformElHeight = width
            transformElLeft = width
            transformElRotate = 'rotate(90deg)'
        }

        const transformElStyle = transformEl.style
        transformElStyle.width = transformElWidth + 'px'
        transformElStyle.height = transformElHeight + 'px'
        transformElStyle.transform = transformElRotate
        transformElStyle.webkitTransform = transformElRotate
        transformElStyle.left = transformElLeft + 'px'
    }

    drawImage({ width = 200, height = 100 } = {}) {
        const activeCanvas = this.activeCanvas
        const clipCanvas = document.createElement('canvas') // 新画布用于裁剪
        const clipCanvasCtx = clipCanvas.getContext('2d') as CanvasRenderingContext2D
        const boundary = this.boundaryRecorder.get()
        if (!boundary) {
            // 请绘画
            return null
        }
        clipCanvas.width = width
        clipCanvas.height = height
        // 添加背景
        clipCanvasCtx.fillStyle = '#ffffff'
        clipCanvasCtx.fillRect(0, 0, width, height)

        // set padding 4，fix boundary
        const maxX = boundary.maxX + 4
        const maxY = boundary.maxY + 4
        const minX = Math.max(boundary.minX - 4, 0)
        const minY = Math.max(boundary.minY - 4, 0)

        const boundaryWidth = maxX - minX
        const boundaryHeight = maxY - minY

        if (this.isLandscape()) {
            // 横屏
            clipCanvasCtx.drawImage(activeCanvas, minX, minY, boundaryWidth, boundaryHeight, 0, 0, width, height)
        } else {
            // 竖屏

            // 向下平移100(表示以下都会基于向下平移100来进行操作)
            clipCanvasCtx.translate(0, height)
            // 以画布的0,0为原点顺时针旋转270度(因为向下平移了100,所以可见)
            clipCanvasCtx.rotate((270 * Math.PI) / 180)

            // 这里截图 根据未位移和旋转前的来进行截图

            // 旋转后，高和宽的概念也要变换
            const viewHeight = boundaryWidth
            const viewWidth = boundaryHeight

            if (height / width > viewHeight / viewWidth) {
                // 以宽度为标准
                const realHeight = (width * viewHeight) / viewWidth
                clipCanvasCtx.drawImage(
                    activeCanvas,
                    minX,
                    minY,
                    boundaryWidth,
                    boundaryHeight,
                    (height - realHeight) / 2,
                    0,
                    realHeight,
                    width
                )
            } else {
                // 以高度为标准
                const realWidth = (height * viewWidth) / viewHeight

                clipCanvasCtx.drawImage(
                    activeCanvas,
                    minX,
                    minY,
                    boundaryWidth,
                    boundaryHeight,
                    0,
                    (width - realWidth) / 2,
                    height,
                    realWidth
                )
            }
        }
        this.clearCanvas()
        return clipCanvas.toDataURL(this.imageType, 1) // 1为画质0-1
    }
}

function getPosition(evt: any) {
    const { pageX, pageY } = evt.touches ? evt.touches[0] : evt.targetTouches ? evt.targetTouches[0] : evt
    const target = evt.target
    const { left, top } = getOffset(target)
    // getOffset(event.target).left兼容
    // getOffset(event.target).top兼容
    return {
        x: pageX - left,
        y: pageY - top,
    }
}

interface Axis {
    x: number
    y: number
}

function createBoundaryRecorder() {
    let site: {
        minY: number
        maxY: number
        minX: number
        maxX: number
    }
    return {
        get() {
            return site
        },
        record(axis: Axis) {
            const { x: axisX, y: axisY } = axis
            if (!site) {
                site = { minY: axisY, maxY: axisY, minX: axisX, maxX: axisX }
                return
            }

            const { minY, maxY, minX, maxX } = site

            if (minX > axisX) {
                site.minX = axisX
            } else if (maxX < axisX) {
                site.maxX = axisX
            }
            if (minY > axisY) {
                site.minY = axisY
            } else if (maxY < axisY) {
                site.maxY = axisY
            }
        },
    }
}

function touchStart(evt: any, canvasCtx: any, callback: any) {
    // 触摸按下
    const oEvent = evt || event

    const axis: Axis = getPosition(oEvent)

    callback(axis, evt.timeStamp)

    canvasCtx.beginPath() // 必须开启路径,否则不能清理掉(clearRect)

    canvasCtx.moveTo(axis.x, axis.y)

    oEvent.preventDefault()
}

function touchMove(evt: any, canvasCtx: any, getBoundaryRecorder: any, callback: any) {
    const oEvent = evt || event

    const axis: Axis = getPosition(oEvent) // 对象

    const { x, y } = axis

    const { width: maxX, height: maxY } = canvasCtx.canvas

    // 超出必须忽略
    if (x < 0 || y < 0 || x > maxX || y > maxY) {
        return
    }

    callback(axis, evt.timeStamp)

    canvasCtx.lineTo(x, y)

    const boundaryRecorder = getBoundaryRecorder()

    boundaryRecorder.record(axis)

    canvasCtx.stroke()

    oEvent.preventDefault()
}
