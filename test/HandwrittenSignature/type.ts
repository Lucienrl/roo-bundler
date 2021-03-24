export interface SignatureConfig {
        brushColor?: string
    brushWidth?: number
    imageType?: string
    // 最外层元素
    wrapperEl: HTMLElement
    // 用于旋转的包裹元素
    transformEl: HTMLElement
    // canvas容器
    canvasContainerEl: HTMLElement

    event?: any
}
