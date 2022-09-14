import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
// @ts-ignore
import ffProbePath from "@ffprobe-installer/ffprobe";
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffProbePath.path);

export default ffmpeg;
