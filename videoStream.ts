import { EventEmitter } from "events";
import { Server, WebSocket } from "ws";
import Mpeg1Muxer from './mpeg1muxer';
import { IncomingMessage } from "http";

const STREAM_MAGIC_BYTES = "jsmp" // Must be 4 bytes

export default class VideoStream extends EventEmitter {

  private mpeg1Muxer: Mpeg1Muxer;
  private ffmpegOptions: {}
  private ffmpegPath: string;
  private width: number
  private height: number
  private name: string
  private streamUrl: string
  private wsPort: number
  private inputStreamStarted = false
  private stream = undefined
  private wsServer: Server;

  constructor(options: {
    name: string,
    streamUrl: string,
    wsPort: number,
    ffmpegOptions: Record<string, unknown>,
    ffmpegPath?: string,
    width: number,
    height: number,
  }) {
    super();
    this.ffmpegOptions = options.ffmpegOptions;
    this.ffmpegPath = options.ffmpegPath;
    this.name = options.name
    this.streamUrl = options.streamUrl
    this.width = options.width
    this.height = options.height
    this.wsPort = options.wsPort
    this.startMpeg1Stream()
    this.pipeStreamToSocketServer()
  }

  stop() {
    this.wsServer.close()
    this.stream.kill()
    this.inputStreamStarted = false
    return this
  }

  startMpeg1Stream() {
    var gettingInputData, gettingOutputData, inputData, outputData
    this.mpeg1Muxer = new Mpeg1Muxer({
      ffmpegOptions: this.ffmpegOptions,
      url: this.streamUrl,
      ffmpegPath: this.ffmpegPath == undefined ? "ffmpeg" : this.ffmpegPath
    })
    this.stream = this.mpeg1Muxer.stream
    if (this.inputStreamStarted) {
      return
    }
    this.mpeg1Muxer.on('mpeg1data', (data) => {
      return this.emit('camdata', data)
    })
    gettingInputData = false
    inputData = []
    gettingOutputData = false
    outputData = []
    this.mpeg1Muxer.on('ffmpegStderr', (data) => {
      var size
      data = data.toString()
      if (data.indexOf('Input #') !== -1) {
        gettingInputData = true
      }
      if (data.indexOf('Output #') !== -1) {
        gettingInputData = false
        gettingOutputData = true
      }
      if (data.indexOf('frame') === 0) {
        gettingOutputData = false
      }
      if (gettingInputData) {
        inputData.push(data.toString())
        size = data.match(/\d+x\d+/)
        if (size != null) {
          size = size[0].split('x')
          if (this.width == null) {
            this.width = parseInt(size[0], 10)
          }
          if (this.height == null) {
            return this.height = parseInt(size[1], 10)
          }
        }
      }
    })
    this.mpeg1Muxer.on('ffmpegStderr', function(data) {
      return global.process.stderr.write(data)
    })
    this.mpeg1Muxer.on('exitWithError', () => {
      return this.emit('exitWithError')
    })
    return this
  }

  pipeStreamToSocketServer() {
    this.wsServer = new Server({
      port: this.wsPort
    })
    this.wsServer.on("connection", (socket, request) => {
      return this.onSocketConnect(socket, request)
    })
    return this.on('camdata', (data, opts) => {
      var results
      results = []
      for (let clientN = 0; clientN < this.wsServer.clients.size; clientN++) {
        if (this.wsServer.clients[clientN].readyState === 1) {
          results.push(this.wsServer.clients[clientN].send(data))
        } else {
          results.push(console.log("Error: Client from remoteAddress " + this.wsServer.clients[clientN].remoteAddress + " not connected."))
        }
      }
      return results
    })
  }
  onSocketConnect(socket: WebSocket, request: IncomingMessage) {
    var streamHeader
    // Send magic bytes and video size to the newly connected socket
    // struct { char magic[4]; unsigned short width, height;}
    streamHeader = Buffer.alloc(8)
    streamHeader.write(STREAM_MAGIC_BYTES)
    streamHeader.writeUInt16BE(this.width, 4)
    streamHeader.writeUInt16BE(this.height, 6)
    socket.send(streamHeader)
    console.log(`${this.name}: New WebSocket Connection (` + this.wsServer.clients.size + " total)")
  
    // socket.remoteAddress = request.connection.remoteAddress
  
    return socket.on("close", (code, message) => {
      return console.log(`${this.name}: Disconnected WebSocket (` + this.wsServer.clients.size + " total)")
    })
  }
}