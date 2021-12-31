/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/dot-notation */
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { AlertController, LoadingController, Platform } from '@ionic/angular';
import jsQR from 'jsqr';
import { HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements AfterViewInit{
  @ViewChild('video', { static: false }) video: ElementRef;
  @ViewChild('canvas', { static: false }) canvas: ElementRef;
  @ViewChild('fileinput', { static: false }) fileinput: ElementRef;

  canvasElement: any;
  videoElement: any;
  canvasContext: any;
  scanActive = false;
  scanResult = null;
  loading: HTMLIonLoadingElement = null;

  firstName: string;
  middleName: string;
  time: string;
  mSISDN: string;
  status: string;

  currentPage: string;

  constructor(
    private alertController: AlertController,
    private loadingCtrl: LoadingController,
    private plt: Platform,
    private myHttp: HttpClient,
  ) {
    const isInStandaloneMode = () =>
      'standalone' in window.navigator && window.navigator['standalone'];
      if (this.plt.is('ios') && isInStandaloneMode()) {
        console.log('I am a an iOS PWA!');
        // E.g. hide the scan functionality!
      }
  }
  ngAfterViewInit() {
    this.canvasElement = this.canvas.nativeElement;
    this.canvasContext = this.canvasElement.getContext('2d');
    this.videoElement = this.video.nativeElement;
  }
  reset() {
    this.scanResult = null;
    this.clearData();
  }

  stopScan() {
    this.scanActive = false;
    this.clearData();

  }
  async startScan() {
    this.clearData();

    // Not working on iOS standalone mode!
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    this.videoElement.srcObject = stream;
    // Required for Safari
    this.videoElement.setAttribute('playsinline', true);

    this.loading = await this.loadingCtrl.create({ message: 'validating, Please wait..'});
    await this.loading.present();

    this.videoElement.play();
    requestAnimationFrame(this.scan.bind(this));
  }

  async scan() {
    if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
      if (this.loading) {
        await this.loading.dismiss();
        this.loading = null;
        this.scanActive = true;
      }

      this.canvasElement.height = this.videoElement.videoHeight;
      this.canvasElement.width = this.videoElement.videoWidth;

      this.canvasContext.drawImage(
        this.videoElement,
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
      const imageData = this.canvasContext.getImageData(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code) {
        this.scanActive = false;
        this.scanResult = code.data;
        this.checkData(this.scanResult);
      } else {
        if (this.scanActive) {
          requestAnimationFrame(this.scan.bind(this));
        }
      }
    } else {
      requestAnimationFrame(this.scan.bind(this));
    }
  }
  captureImage() {
    this.fileinput.nativeElement.click();
  }

  handleFile(files: FileList) {
    const file = files.item(0);

    const img = new Image();
    img.onload = () => {
      this.canvasContext.drawImage(img, 0, 0, this.canvasElement.width, this.canvasElement.height);
      const imageData = this.canvasContext.getImageData(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code) {
        this.scanResult = code.data;
        this.checkData(this.scanResult);
      }
    };
    img.src = URL.createObjectURL(file);
  }
  async checkData(url){
    this.loading = await this.loadingCtrl.create({ message: 'Validating Please wait ...'});
    await this.loading.present();
    this.currentPage= (url.split('?')[1]);
    if(!this.currentPage){
      return this.loading.dismiss();
    }
    // const postData = {daata: 123};
    this.myHttp.post('https://pwejar.herokuapp.com/prod/senders/checkticko/'+this.currentPage, {})
    .subscribe((data: any) => {
      console.log(data);
      this.loading.dismiss();
      this.firstName = data.response56.FirstName;
      this.middleName = data.response56.MiddleName;
      this.mSISDN = data.response56.MSISDN;
      this.time = ` ${data.response56.TransTime.substring(0,4)}/${data.response56.TransTime.substring(4,6)}/${data.response56.TransTime.substring(6,8)} ${data.response56.TransTime.substring(8,10)}:${data.response56.TransTime.substring(10,12)}`;
      if(data.response56.used === true) {
          this.status = 'Used';
      } else{
          this.status = 'Not Used';
      }
      }, error => {
      console.log(error);
      alert(error.message);
      this.loading.dismiss();
    });

  }

  clearData(){
    this.firstName = '';
    this.middleName = '';
    this.mSISDN = '';
    this.time = ``;
    this.status = '';
  }
  async useTicket(){
    this.loading = await this.loadingCtrl.create({ message: 'Shredding Ticket, Please wait..'});
    await this.loading.present();
    this.myHttp.post('https://pwejar.herokuapp.com/prod/senders/useticko/'+this.currentPage, {})
    .subscribe((data: any) => {
      console.log(data);
      this.loading.dismiss();
      console.log(data);
      if(data.response78i._id) {
        this.status = 'Used';
      } else{
        this.loading.dismiss();
        this.presentAlert({
          header: 'Error While shredding',
          message: 'Kindly try again',
          buttons: ['OK']
        });
      }
      }, error => {
      console.log(error);
      this.presentAlert({
        header: 'Error While shredding',
        message: 'Kindly try again',
        buttons: ['OK']
      });
      this.loading.dismiss();
    });
  }
  async presentAlert(options) {
    const alert = await this.alertController.create(options);

    await alert.present();

  }
}
