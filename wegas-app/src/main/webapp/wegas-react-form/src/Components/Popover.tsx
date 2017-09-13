import React from 'react';

interface IPopoverProps {
    onClickOutside?: (event: MouseEvent) => void;
    show: boolean;
}
class Popover extends React.Component<IPopoverProps> {
    static defaultProps: Partial<IPopoverProps> = {
        onClickOutside: function noop() {},
    };

    container: HTMLSpanElement | null;
    constructor(props: IPopoverProps) {
        super(props);
        this.checkClickOutside = this.checkClickOutside.bind(this);
    }
    track() {
        document.addEventListener('mousedown', this.checkClickOutside);
        document.addEventListener('touchstart', this.checkClickOutside);
    }
    unTrack() {
        document.removeEventListener('mousedown', this.checkClickOutside);
        document.removeEventListener('touchstart', this.checkClickOutside);
    }
    componentDidMount() {
        if (this.props.show) {
            this.track();
        }
    }
    componentDidUpdate(prevProps: IPopoverProps) {
        if (!prevProps.show && this.props.show) {
            this.track();
        } else if (prevProps.show && !this.props.show) {
            this.unTrack();
        }
    }
    componentWillUnmount() {
        this.unTrack();
    }
    checkClickOutside(event: MouseEvent) {
        if (this.container && !this.container.contains(event.target as Node)) {
            (this.props.onClickOutside as ((event: MouseEvent) => void))(event); // default props not handled.
        }
    }
    render() {
        if (this.props.show) {
            return (
                <div
                    ref={node => {
                        this.container = node;
                    }}
                    style={{ position: 'relative', display: 'inline-block' }}
                >
                    <div style={{ position: 'absolute', zIndex: 1000, top: '4px' }}>
                        {this.props.children}
                    </div>
                </div>
            );
        }
        return null;
    }
}
Popover.defaultProps = {
    onClickOutside: function noop() {},
    show: false,
};
export default Popover;
