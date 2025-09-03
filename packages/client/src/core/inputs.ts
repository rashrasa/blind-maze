

export interface InputHandler {
    handleInputState(): unknown;
    addInputStateHandler(handler: (state: Map<string, boolean>) => void): void
    removeInputStateHandler(handler: (state: Map<string, boolean>) => void): void
    addMouseEventHandler(handler: (ev: MouseEvent) => void): void
    removeMouseEventHandler(handler: (ev: MouseEvent) => void): void
    dispose(): void
}

export class DefaultInputHandler implements InputHandler {
    private readonly window: Window;
    private readonly keysPressed: Map<string, boolean>
    private readonly inputListeners: ((state: Map<string, boolean>) => void)[]

    private disposed: boolean;

    constructor(rendererElement: HTMLElement) {
        this.window = rendererElement.ownerDocument.defaultView!;
        this.keysPressed = new Map()

        this.inputListeners = []
        this.disposed = false

        this.window.addEventListener("keydown", this.handleKeyDown.bind(this));
        this.window.addEventListener("keyup", this.handleKeyUp.bind(this));

    }
    addInputStateHandler(handler: (state: Map<string, boolean>) => void): void {
        this.inputListeners.push(handler)
    }
    removeInputStateHandler(handler: (state: Map<string, boolean>) => void): void {
        this.inputListeners.splice(this.inputListeners.findIndex((value) => value == handler), 1)
    }

    addMouseEventHandler(handler: (ev: MouseEvent) => void): void {
        this.window.addEventListener("click", handler)
    }
    removeMouseEventHandler(handler: (ev: MouseEvent) => void): void {
        this.window.removeEventListener("click", handler)
    }

    private handleKeyUp(event: KeyboardEvent) {
        const inputKey = event.code
        switch (inputKey) {
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
                event.preventDefault()
                this.keysPressed.set(inputKey, false)
                break;
            default:
                this.keysPressed.set(inputKey, false)
                break;
        }
    }

    private handleKeyDown(event: KeyboardEvent) {
        const inputKey = event.code
        switch (inputKey) {
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
                event.preventDefault()
                this.keysPressed.set(inputKey, true)
                break;
            default:
                this.keysPressed.set(inputKey, true)
                break;
        }
    }
    handleInputState() {
        for (const callback of this.inputListeners) {
            callback(this.keysPressed)
        }
    }

    dispose() {
        this.window.removeEventListener("keydown", this.handleKeyDown.bind(this))
        this.window.removeEventListener("keyup", this.handleKeyUp.bind(this))

        this.disposed = true
    }
}