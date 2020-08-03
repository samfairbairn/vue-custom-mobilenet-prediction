<template lang="pug">
  #app
    .stats(ref="stats")
    canvas(ref="canvas" width="224" height="224")
    video(ref="video" playsinline autoplay muted)
    .label(v-if="label") {{label}}
    .score(v-if="score") {{score.toFixed(5)}}
</template>

<script>

import * as tf from '@tensorflow/tfjs'
import Stats from 'stats.js'
// import manifest from '@/config/poses-manifest'
import { PRETRAINED_MODEL, MOBILENET_MODEL_PATH } from '@/config/constants'
import { Camera } from '@/services/getMediaDevices.js'
// import { IMAGENET_CLASSES } from '@/config/imagenet_classes'

// const labels = manifest.labels
const labels = ['facepalm', 'peace']

export default {
  name: 'App',
  components: {},
  data: () => ({
    stats: undefined,
    pretrainedModel: undefined,
    model: undefined,
    streamSettings: undefined,
    testIndex: 0,
    label: undefined,
    score: undefined
  }),
  mounted () {
    this.stats = new Stats()
    this.stats.showPanel(0)
    this.$refs.stats.appendChild( this.stats.dom )

    this.start()
  },
  methods: {
    async loadVideo () {
      // after the camera is initialised, play the video feed
      await this.setupCamera();
      this.$refs.video.play();
      return
    },

    async setupCamera() {
      // navigator.getUserMedia=navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia||navigator.msGetUserMedia;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.parent.onError('Browser API navigator.mediaDevices.getUserMedia not available')
        throw new Error(
          "Browser API navigator.mediaDevices.getUserMedia not available"
        );
      }

      let stream = await Camera.initSourceWebcam()
      this.$refs.video.srcObject = stream

      return new Promise(resolve => {
        this.$refs.video.onloadedmetadata = () => {
          this.streamSettings = stream.getVideoTracks()[0].getSettings()
          resolve()
        }
      })
    },

    loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          const canvas = this.$refs.canvas
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, 224, 224)
          // resolve(tf.fromPixels(img))
          resolve(tf.fromPixels(this.$refs.canvas))
        }
        img.onerror = (err) => reject(err);
      });
    },

    async prepareModel () {
      return tf.loadModel(PRETRAINED_MODEL).then(model => {
        const layer = model.getLayer('conv_pw_13_relu');
        return tf.model({
          inputs: [model.inputs[0]],
          outputs: layer.output,
        });
      }).then(pretrainedModel => {
        this.pretrainedModel = pretrainedModel
        return tf.loadModel(MOBILENET_MODEL_PATH).then(model => model);
      }).catch(err => {
        console.error('Error', err);
      });
    },

    cropImage (img) {
      const width = img.shape[0];
      const height = img.shape[1];

      // use the shorter side as the size to which we will crop
      const shorterSide = Math.min(img.shape[0], img.shape[1]);

      // calculate beginning and ending crop points
      const startingHeight = (height - shorterSide) / 2;
      const startingWidth = (width - shorterSide) / 2;
      const endingHeight = startingHeight + shorterSide;
      const endingWidth = startingWidth + shorterSide;

      // return image data cropped to those points
      let slice = img.slice([startingWidth, startingHeight, 0], [endingWidth, endingHeight, 3]);
      return slice
    },

    resizeImage (image) {
      return tf.image.resizeBilinear(image, [224, 224]);
    },

    batchImage (image) {
      // Expand our tensor to have an additional dimension, whose size is 1
      // Turn pixel data into a float between -1 and 1.
      const batchedImage = image.expandDims(0);
      return batchedImage.toFloat().div(tf.scalar(127)).sub(tf.scalar(1));
    },


    loadAndProcessImage(image) {
      // const croppedImage = this.cropImage(image);
      const resizedImage = this.resizeImage(image);
      const batchedImage = this.batchImage(resizedImage);
      return batchedImage;
    },

    async makePrediction (image) {

      let loadedImage

      if (image) {
        loadedImage = await this.loadImage(image)
      } else {
        // assuming video canvas
        const canvas = this.$refs.canvas
        const ctx = canvas.getContext('2d')
        ctx.drawImage(this.$refs.video, 0, 0, 244, 244)

        loadedImage = tf.fromPixels(this.$refs.canvas)
      }

      const processedImage = this.loadAndProcessImage(loadedImage)
      const activatedImage = await this.pretrainedModel.predict(processedImage)
      loadedImage.dispose()

      const prediction = await this.model.predict(activatedImage)
      const as1D = prediction.as1D()
      const max = as1D.argMax()
      const predictionLabel = max.dataSync()[0]
      const score = as1D.get([predictionLabel])

      prediction.dispose()
      activatedImage.dispose()
      
      return { label: labels[predictionLabel], score: score }
    },

    async start () {
      await this.loadVideo()
      this.model = await this.prepareModel()
      console.log('Models loaded')
      this.imageLoop()
    },

    async imageLoop () {
      this.stats.begin()

      // let result = await this.makePrediction(manifest.testing[this.testIndex].image)
      let result = await this.makePrediction()

      this.label = result.label
      this.score = result.score
      
      this.testIndex++
      this.stats.end()

      // if (this.testIndex < manifest.testing.length) setTimeout(() => { requestAnimationFrame(this.imageLoop.bind(this)) }, 1000)
      requestAnimationFrame(this.imageLoop.bind(this))
    }

  }
}
</script>

<style lang="sass">
#app
  font-family: Avenir, Helvetica, Arial, sans-serif
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale
  .label
    font-size: 30px
    position: absolute
    top: 60px
    left: 10px
  .score
    font-size: 14px
    position: absolute
    top: 100px
    left: 10px
</style>
