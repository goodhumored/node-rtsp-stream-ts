
import VideoStream from "../";
import assert from "assert";

describe('node-rstp-stream', function() {
  return it('should not throw an error when instantiated', function(done) {
    var videoStream;
    videoStream = new VideoStream({
      name: 'wowza',
      streamUrl: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov',
      wsPort: 9999,
      width: 240,
      height: 160,
      ffmpegOptions: {
        '-stats': '',
        '-r': '30'
      }
    });
    videoStream.on('exitWithError', () => {
      videoStream.stop();
      assert.fail('videoStream exited with error');
      return done();
    });
    // Must use setTimeout because we need the stream instantiated before we can stop it
    // otherwise it blocks the test runner from exiting.
    return setTimeout(() => {
      videoStream.stop();
      return done();
    }, 1900);
  });
});
