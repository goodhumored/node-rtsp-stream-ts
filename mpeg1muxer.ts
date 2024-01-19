import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import EventEmitter = require("events");

export default class Mpeg1Muxer extends EventEmitter {
  private url: string;
  private ffmpegOptions: Record<string, unknown>;
  private exitCode: number | undefined = undefined;
  private additionalFlags: string[] = [];
  private spawnOptions: string[] = [];
  public stream: ChildProcessWithoutNullStreams;
  public inputStreamStarted = false;

  constructor(options: {url: string, ffmpegOptions: Record<string, unknown>, ffmpegPath: string}) {
    super();
    this.url = options.url
    this.ffmpegOptions = options.ffmpegOptions
    if (this.ffmpegOptions) {
      for (let key in this.ffmpegOptions) {
        this.additionalFlags.push(key)
        if (String(this.ffmpegOptions[key]) !== '') {
          this.additionalFlags.push(String(this.ffmpegOptions[key]))
        }
      }
    }
    this.spawnOptions = [
      "-rtsp_transport",
      "tcp",
      "-i",
      this.url,
      '-f',
      'mpegts',
      '-codec:v',
      'mpeg1video',
      // additional ffmpeg options go here
      ...this.additionalFlags,
      '-'
    ]
    this.stream = spawn(options.ffmpegPath, this.spawnOptions, {
      detached: false
    })
    this.inputStreamStarted = true
    this.stream.stdout.on('data', (data) => {
      return this.emit('mpeg1data', data)
    })
    this.stream.stderr.on('data', (data) => {
      return this.emit('ffmpegStderr', data)
    })
    this.stream.on('exit', (code, signal) => {
      if (code === 1) {
        console.error('RTSP stream exited with error')
        this.exitCode = 1
        return this.emit('exitWithError')
      }
    })
    return this
  }
}
