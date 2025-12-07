declare module 'react-signature-canvas' {
  import { Component, RefAttributes } from 'react';

  export interface SignatureCanvasProps {
    penColor?: string;
    backgroundColor?: string;
    velocityFilterWeight?: number;
    minWidth?: number;
    maxWidth?: number;
    throttle?: number;
    minDistance?: number;
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
    clearOnResize?: boolean;
    onEnd?: () => void;
    onBegin?: () => void;
  }

  export interface SignatureCanvasRef {
    clear: () => void;
    fromDataURL: (dataURL: string) => void;
    toDataURL: (type?: string, quality?: number) => string;
    fromData: (pointGroups: any[]) => void;
    toData: () => any[];
    getCanvas: () => HTMLCanvasElement;
    getTrimmedCanvas: () => HTMLCanvasElement;
    isEmpty: () => boolean;
  }

  export default class SignatureCanvas extends Component<SignatureCanvasProps & RefAttributes<SignatureCanvasRef>> {
    clear: () => void;
    fromDataURL: (dataURL: string) => void;
    toDataURL: (type?: string, quality?: number) => string;
    fromData: (pointGroups: any[]) => void;
    toData: () => any[];
    getCanvas: () => HTMLCanvasElement;
    getTrimmedCanvas: () => HTMLCanvasElement;
    isEmpty: () => boolean;
  }
}

