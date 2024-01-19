export = VideoStream;
declare class VideoStream {
    private constructor();
    stop(): this;
    inputStreamStarted: boolean;
    startMpeg1Stream(): this;
    mpeg1Muxer: any;
    stream: any;
    width: number;
    height: number;
    pipeStreamToSocketServer(): any;
    wsServer: any;
    onSocketConnect(socket: any, request: any): any;
}
//# sourceMappingURL=videoStream.d.ts.map