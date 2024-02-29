class Outline {
  private div: HTMLDivElement;
  private _width: number;
  private _color: string;
  private _ariaLabel: string;
  private container: HTMLElement;
  constructor(container: HTMLElement) {
    this.container = container;
    this.div = document.createElement('div');
    this._width = 2;
    this._color = '#4d90fe';
    this._ariaLabel = 'Use the arrow keys to rotate the globe';
    this.div.style.display = 'none';
    this.div.style.position = 'absolute';
    this.div.style.pointerEvents = 'none';
    this.div.style.borderRadius = '50%';
    this.updateOutline();
    this.container.tabIndex = 0;
    this.updateContainer();
    this.container.appendChild(this.div);
    this.container.addEventListener('focus', this.onFocus.bind(this));
    this.container.addEventListener('blur', this.onBlur.bind(this));
  }

  get width() {
    return this._width;
  }

  set width(value: number) {
    this._width = value;
    this.updateOutline();
  }

  get color() {
    return this._color;
  }

  set color(value: string) {
    this._color = value;
    this.updateOutline();
  }

  get ariaLabel() {
    return this._ariaLabel;
  }

  set ariaLabel(value: string) {
    this._ariaLabel = value;
    this.updateContainer();
  }

  public calculateSize(cameraZoom: number) {
    const minDimension = Math.min(
      this.container.clientHeight,
      this.container.clientWidth,
    );
    this.div.style.width = `${(minDimension - 2 * this.width) * cameraZoom}px`;
    this.div.style.height = `${(minDimension - 2 * this.width) * cameraZoom}px`;
  }

  private updateOutline() {
    this.div.style.outline = `${this._width}px solid ${this._color}`;
  }

  private updateContainer() {
    this.container.ariaLabel = this._ariaLabel;
  }

  private onFocus() {
    this.div.style.display = 'block';
  }

  private onBlur() {
    this.div.style.display = 'none';
  }

  public dispose() {
    this.container.removeEventListener('focus', this.onFocus.bind(this));
    this.container.removeEventListener('blur', this.onBlur.bind(this));
    this.container.removeChild(this.div);
  }
}

export { Outline };
