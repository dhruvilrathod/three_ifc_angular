import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { NgZone, OnDestroy } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IFCLoader } from 'web-ifc-three';
import { IFCModel } from 'web-ifc-three/IFC/components/IFCModel';
import { HttpClient, HttpEventType } from '@angular/common/http';
import * as WEBIFC from './categories.json';


@Component({
  selector: 'app-engine',
  templateUrl: './engine.component.html'
})
export class EngineComponent implements OnInit, OnDestroy {

  @ViewChild('c1', { static: true })
  public rendererCanvas: ElementRef<HTMLCanvasElement>;

  // sample url
  // public ifcurl: string = 'http://127.0.0.1:5500/my_ifc1.ifc';
  // public ifcurl: string = './assets/Electrical Design.ifc';
  // public ifcurl: string = './assets/Architecture Design.ifc';

  public ifcurl: string;
  public ifcFileName: string;
  public selectedFileName: string;
  public clientID: number;

  private ifcText: string = null;
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private gridHelper: THREE.GridHelper;
  private axes: THREE.AxesHelper;
  public controls: OrbitControls;
  private frameId: number = null;


  private size = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  private lightColor = 0xffffff;


  // public variables to show in view
  public selectedObjectID: number = null;
  public ifcModelID: number = null;
  public hoveredObjectType: any;
  public selectedModelID: any = null;
  public ifcObjects: any;

  public elementListModalOpen: boolean = false;
  public elementDetailsModalOpen: boolean = false;
  public elementTreeModalOpen: boolean = false;
  public metadataModalOpen: boolean = false;
  public isControlPanelModalOpen: boolean = false;
  public searchInputModalOpen: boolean = false;
  public buttonListModalOpen: boolean = false;
  public isLoading: boolean = true;
  public isUploading: boolean = false;
  public uploadingMessage: string;
  public showSearchLoading: boolean = false;

  public loadingMessage: string = '';
  public isFullScreen: boolean = false;

  public isTranperentModel: boolean = false;
  public instructionModalOpen: boolean = false;
  public liveDetailsModal: boolean = true;
  public isAxesHelperOn: boolean = true;
  public isBasePlaneOn: boolean = true;
  public isLiveDetailsOn: boolean = true;
  public isErrorHappened: boolean = false;

  // for search result
  public searchString: string;
  public allDetailsForSearch = [];
  public resultErrorMessage: string;

  // IFC types list (from view)
  public allIFCCategories = [];
  public types = [];
  public filteredTypes = [];
  public levelOfType: number = 0;
  public maxLevel: number = this.levelOfType;
  public nextLevelToExtract: number = 1;
  public expressIDOfPreviousLevel: number = null;
  public ifcTypesSelectedDetails = [];
  public allCategories = [];
  // after item selected from model
  public selectedItemProperties = [];
  public selectedItemPropertySets = [];
  public elementIfcType: string;
  // ifc metadata on load
  public metaDataVariables = ["IFCAPPLICATION", 'IFCORGANIZATION', 'IFCPOSTALADDRESS', 'IFCTELECOMADDRESS', 'IFCPERSON', 'IFCACTORROLE'];
  public IFCAPPLICATION = [];
  public IFCORGANIZATION = [];
  public IFCPOSTALADDRESS = [];
  public IFCTELECOMADDRESS = [];
  public IFCPERSON = [];



  public constructor(
    private ngZone: NgZone,
    private http: HttpClient
  ) { }

  public ngOnInit(): void {
    this.isLoading = true;
    if (this.ifcurl != null && this.ifcurl != '') {
      this.ifcFileName = this.ifcurl.substring(this.ifcurl.lastIndexOf('/') + 1);
      this.loadIFC(this.ifcurl).then(() => this.createScene(this.rendererCanvas).then(() => this.animate()))
    }
    else this.isLoading = false;
    if (document.addEventListener) {
      document.addEventListener('webkitfullscreenchange', () => {
        this.isFullScreen = !this.isFullScreen;
      }, false);
      document.addEventListener('mozfullscreenchange', () => {
        this.isFullScreen = !this.isFullScreen;
      }, false);
      document.addEventListener('fullscreenchange', () => {
        this.isFullScreen = !this.isFullScreen;
      }, false);
      document.addEventListener('MSFullscreenChange', () => {
        this.isFullScreen = !this.isFullScreen;
      }, false);
    }
    document.addEventListener('keydown', (e) => {
      if (e.shiftKey) document.getElementsByTagName('body').item(0).classList.add('cursor-move');
    });
    document.addEventListener('keyup', (e) => {
      if (!e.shiftKey) document.getElementsByTagName('body').item(0).classList.remove('cursor-move');
    });
  }

  public ngOnDestroy(): void {
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
    }
    if (this.renderer != null) {
      this.renderer.dispose();
      this.renderer = null;
      this.canvas = null;
    }
    window.location.reload();
  }


  public linkInserted(url) {
    console.log('link inserted function');
    this.isUploading = false;
    this.ifcurl = url;
    if (this.ifcurl != '' && this.ifcurl != null) {
      this.createScene(this.rendererCanvas).then(() => { this.loadIFC(this.ifcurl).then(() => this.animate()) });
    }
  }

  public doubleClickedEvent(e): void {
    this.highlightSelect(e);
    this.removeHighlight();
  }

  public mouseOverEvent(e): void {
    if (this.isLiveDetailsOn) this.hoveredObjectType = this.highlightHover(e);
  }

  public onRemoveHighlight(): void {
    this.selectedObjectID = this.removeHighlight();
  }

  public fileSelected(e) {
    this.isUploading = true;
    this.ifcFileName = e.target.files[0].name;
    this.selectedFileName = '';
    var formData = new FormData();
    formData.append('ifcfile', e.target.files[0], e.target.files[0].name);
    var newPostRequest = this.http.post('http://localhost:3000/api/upload', formData).subscribe((data: any) => {
      this.selectedFileName = data.file.filename;
      this.clientID = data.client;
      console.log(this.selectedFileName);
      this.http.get('http://localhost:3000/events', { params: { filename: this.selectedFileName, clientId: this.clientID } }).subscribe(data1 => {
        console.log(data1);
      });
      var ifcurl = 'http://localhost:3000/api/file?filename=' + this.selectedFileName + '&originalname=' + this.ifcFileName;
      console.log(ifcurl);
      this.linkInserted(ifcurl);
    }, (err) => this.isErrorHappened = true);
  }

  public controlChange(control) {
    if (control == 'base_plane') {
      this.isBasePlaneOn = !this.isBasePlaneOn;
      if (this.isBasePlaneOn) this.scene.add(this.gridHelper);
      else this.scene.remove(this.gridHelper)
    }
    else if (control == 'axes_helper') {
      this.isAxesHelperOn = !this.isAxesHelperOn;
      if (this.isAxesHelperOn) this.scene.add(this.axes);
      else this.scene.remove(this.axes);
    }
  }

  public fullScreen(): void {
    if (!this.isFullScreen) {
      this.closeAllModals();
      const docElmWithBrowsersFullScreenFunctions = document.documentElement as HTMLElement & {
        mozRequestFullScreen(): Promise<void>;
        webkitRequestFullscreen(): Promise<void>;
        msRequestFullscreen(): Promise<void>;
      };

      if (docElmWithBrowsersFullScreenFunctions.requestFullscreen) {
        docElmWithBrowsersFullScreenFunctions.requestFullscreen();
      } else if (docElmWithBrowsersFullScreenFunctions.mozRequestFullScreen) { /* Firefox */
        docElmWithBrowsersFullScreenFunctions.mozRequestFullScreen();
      } else if (docElmWithBrowsersFullScreenFunctions.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        docElmWithBrowsersFullScreenFunctions.webkitRequestFullscreen();
      } else if (docElmWithBrowsersFullScreenFunctions.msRequestFullscreen) { /* IE/Edge */
        docElmWithBrowsersFullScreenFunctions.msRequestFullscreen();
      }
    }
    else {
      const docWithBrowsersExitFunctions = document as Document & {
        mozCancelFullScreen(): Promise<void>;
        webkitExitFullscreen(): Promise<void>;
        msExitFullscreen(): Promise<void>;
      };
      if (docWithBrowsersExitFunctions.exitFullscreen) {
        docWithBrowsersExitFunctions.exitFullscreen();
      } else if (docWithBrowsersExitFunctions.mozCancelFullScreen) { /* Firefox */
        docWithBrowsersExitFunctions.mozCancelFullScreen();
      } else if (docWithBrowsersExitFunctions.webkitExitFullscreen) { /* Chrome, Safari and Opera */
        docWithBrowsersExitFunctions.webkitExitFullscreen();
      } else if (docWithBrowsersExitFunctions.msExitFullscreen) { /* IE/Edge */
        docWithBrowsersExitFunctions.msExitFullscreen();
      }
    }
  }

  public closeSearchModal() {
    this.searchString = null;
    this.searchInputModalOpen = false;
    this.resultErrorMessage = null;
    this.allDetailsForSearch = [];
  }

  public async searchFunction2(s: string) {
    this.resultErrorMessage = null;
    for (var t in this.types) {
      if (this.types[t].expressID.toString().includes(s) || this.types[t].type.toString().toLocaleLowerCase().includes(s)) {
        this.allDetailsForSearch.push({
          type: this.types[t].type,
          expressID: this.types[t].expressID,
        });
      }
      await this.showSearchDetails(this.types[t].expressID, s);
    }
    if (this.allDetailsForSearch.length == 0) {
      this.resultErrorMessage = `No result found for '` + this.searchString + `'`;
    }
  }

  public searchFunction(s: string) {
    if (s == '' || s == null) {
      this.resultErrorMessage = 'Please enter valid value.';
      return;
    }
    this.resetAllDetails();
    this.elementIfcType = null;
    this.elementDetailsModalOpen = false;
    this.searchString = s;
    this.allDetailsForSearch = [];
    this.showSearchLoading = true;
    setTimeout(() => {
      if (this.showSearchLoading) {
        this.searchFunction2(s).then(() => {
          this.showSearchLoading = false;
        });
      }
    }, 100);
  }

  public async showSearchDetails(expressID: number, query: string) {
    this.resetAllDetails();
    await this.ifc.getItemProperties(this.ifcModelID, expressID).then((data) => {
      for (var x in data) {
        if (data[x] !== null && data[x] !== undefined) {
          if (data[x].value) {
            if (typeof (data[x].value) != 'number') {
              if ((x.toString().toLowerCase().includes(query) || data[x].value.toString().toLowerCase().includes(query) || x.toString().includes(query) || data[x].value.toString().includes(query)) && !this.allDetailsForSearch.find(o => o.expressID === expressID))
                this.allDetailsForSearch.push({
                  name: x,
                  type: this.ifc.getIfcType(0, expressID),
                  expressID: expressID,
                  value: data[x].value
                });
            }
            else if (typeof (data[x].value) == 'number' && data[x].type != 5) {
              if ((x.toString().toLowerCase().includes(query) || data[x].value.toString().toLowerCase().includes(query) || x.toString().includes(query) || data[x].value.toString().includes(query)) && !this.allDetailsForSearch.find(o => o.expressID === expressID))
                this.allDetailsForSearch.push({
                  name: x,
                  type: this.ifc.getIfcType(0, expressID),
                  expressID: expressID,
                  value: data[x].value
                });
            }
          }
          else if (data[x] !== null) {
            if (typeof (data[x]) != 'number') {
              if (x == 'expressID') {
                if ((x.toString().toLowerCase().includes(query) || data[x].toString().toLowerCase().includes(query) || x.toString().includes(query) || data[x].toString().includes(query)) && !this.allDetailsForSearch.find(o => o.expressID === expressID))
                  this.allDetailsForSearch.push({
                    name: x,
                    type: this.ifc.getIfcType(0, expressID),
                    expressID: expressID,
                    value: data[x]
                  });
              }
            }
          }
        }
      }
    });
    await this.ifc.getPropertySets(this.ifcModelID, expressID).then((data) => {
      for (var x in data) {
        if (data[x].Quantities) {
          for (var y in data[x].Quantities) {
            var details = this.parseElementDetailsFromIFCExpressID(data[x].Quantities[y].value);
            if ((details.name.toString().toLowerCase().includes(query) || details.value.toString().toLowerCase().includes(query) || details.name.toString().includes(query) || details.value.toString().includes(query)) && !this.allDetailsForSearch.find(o => o.expressID === expressID)) {
              details.type = this.ifc.getIfcType(0, expressID);
              details.expressID = expressID;
              this.allDetailsForSearch.push(details);
            }
          }
        }
        if (data[x].HasProperties) {
          for (var y in data[x].HasProperties) {
            var details = this.parseElementDetailsFromIFCExpressID(data[x].HasProperties[y].value);
            if ((details.name.toString().toLowerCase().includes(query) || details.value.toString().toLowerCase().includes(query) || details.name.toString().includes(query) || details.value.toString().includes(query)) && !this.allDetailsForSearch.find(o => o.expressID === expressID)) {
              details.type = this.ifc.getIfcType(0, expressID);
              details.expressID = expressID;
              this.allDetailsForSearch.push(details);
            }
          }
        }
      }
    });
    this.elementIfcType = this.ifc.getIfcType(this.ifcModelID, expressID);
    return;
  }

  public resetEverything(): void {
    this.isTranperentModel = false;
    this.instructionModalOpen = false;
    this.liveDetailsModal = true;
    this.isAxesHelperOn = true;
    this.isBasePlaneOn = true;
    this.isControlPanelModalOpen = false;
    this.buttonListModalOpen = false;
    this.isLiveDetailsOn = true;
    if (this.frameId != null) {
      cancelAnimationFrame(this.frameId);
    }
    this.ngOnInit();
    this.resetAllDetails();
  }

  public closeAllModals() {
    this.elementListModalOpen = false;
    this.instructionModalOpen = false;
    this.elementDetailsModalOpen = false;
    this.metadataModalOpen = false;
    this.isControlPanelModalOpen = false;
    this.searchInputModalOpen = false;
  }

  public resetAllDetails() {
    this.ifcTypesSelectedDetails = [];
    this.allIFCCategories = [];
    this.selectedItemProperties = [];
    this.selectedItemPropertySets = [];
    this.elementIfcType = null;
  }

  public exitViewer() {
    this.closeSearchModal();
    this.allIFCCategories = [];
    this.IFCAPPLICATION = [];
    this.IFCORGANIZATION = [];
    this.IFCPOSTALADDRESS = [];
    this.IFCTELECOMADDRESS = [];
    this.IFCPERSON = [];
    this.types = [];
    this.filteredTypes = [];
    this.isErrorHappened = false;
    this.ifcurl = null;
    this.ifcFileName = null;
    this.closeAllModals();
    this.resetEverything();
    window.location.reload();
  }

  // ********************* SERVICE CODE *************************************

  public async createScene(canvas: ElementRef<HTMLCanvasElement>) {
    console.log('create scene function');
    setTimeout(() => {
      this.loadingMessage = 'Creating the scene';
    }, 100);

    this.isErrorHappened = false;
    this.canvas = canvas.nativeElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,    // transparent background
      antialias: true // smooth edges
    });
    this.renderer.setSize(this.size.width, this.size.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // create the scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    //create camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.x = -25;
    this.camera.position.y = 15;
    this.camera.position.z = 0;

    //setup lighting
    this.ambientLight = new THREE.AmbientLight(this.lightColor, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(this.lightColor, 1);
    this.directionalLight.position.set(0, 10, 0);
    this.directionalLight.target.position.set(-5, 0, 0);
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);

    //setup grid helper
    this.gridHelper = new THREE.GridHelper(50, 30);
    this.scene.add(this.gridHelper);

    this.axes = new THREE.AxesHelper(20);
    this.axes.renderOrder = 1;
    this.scene.add(this.axes);

    //setup controls
    this.controls = new OrbitControls(this.camera, this.canvas);
  }

  // keep the scene alive
  public animate(): void {
    this.ngZone.runOutsideAngular(() => {
      if (document.readyState !== 'loading' && !this.isErrorHappened) {
        this.render();
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          this.render();
        });
      }
      window.addEventListener('resize', () => {
        this.resize();
      });
    });
  }

  public render(): void {
    this.frameId = requestAnimationFrame(() => {
      this.render();
    });
    this.renderer.render(this.scene, this.camera);
  }

  public resize(): void {
    this.size.width = window.innerWidth;
    this.size.height = window.innerHeight;
    this.camera.aspect = this.size.width / this.size.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.size.width, this.size.height);
  }


  // ******************************* CODE FOR WORK WITH IFC *************************

  private ifcLoader = new IFCLoader();
  private ifcModels = [];
  public objectToAdd = [];
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private ifc = this.ifcLoader.ifcManager;
  public raycaster: THREE.Raycaster = new THREE.Raycaster();

  public preselectMat = new THREE.MeshLambertMaterial({
    transparent: true,
    opacity: 0.6,
    color: 0xff88ff,
    depthTest: false
  });

  public preselectModel = { id: - 1 };


  public selectMat = new THREE.MeshLambertMaterial({
    transparent: true,
    opacity: 0.6,
    color: 0xff00ff,
    depthTest: false
  });

  public selectModel = { id: -1 };
  public expressID: number = null;

  private box3: THREE.Box3 = new THREE.Box3();
  private boxHelper: THREE.BoxHelper;
  private boxSize: THREE.Vector3 = new THREE.Vector3();

  public spatialStructure: any;
  public ifcModel: IFCModel;


  // function to load ifc model
  public async loadIFC(url: string): Promise<any> {
    console.log('load ifc');
    this.loadingMessage = 'Loading IFC Model';
    this.isLoading = true;
    this.ifc.setWasmPath('./assets/');
    this.ifcLoader.load(url, async (ifcModel: IFCModel) => {
      this.ifcModels.push(ifcModel);
      this.ifcModel = ifcModel;
      this.ifcModelID = ifcModel.modelID;

      // not to add into scene
      this.boxHelper = new THREE.BoxHelper(ifcModel);
      this.box3.setFromObject(this.boxHelper);
      this.box3.getSize(this.boxSize);
      // this.scene.add(this.boxHelper);

      //spatial code
      this.spatialStructure = this.ifc.getSpatialStructure(this.ifcModel.modelID, false);
      this.spatialStructure.then((data: any) => {
        if (data.children.length > 0) {
          data.checked = true;
          data.level = this.levelOfType;
          data.levelIndex = 0;
          data.parentID = 0;
          data.parentExtracted = true;
          data.selfExtracted = false;
          this.types.push(data);
          this.filteredTypes.push(data);
          this.findAllChildrenTypes(data.children, data.expressID);
        }
        else {
          console.log('Empty IFC selected');
          this.isErrorHappened = true;
        }
        for (var i in this.types) {
          console.log(this.types[i]);
          if (!(this.filteredTypes.find(o => o.type === this.types[i].type) && (this.types[i].type != undefined || this.types[i].type != null))) this.filteredTypes.push(this.types[i])
        }
        this.expressIDOfPreviousLevel = 0;
        this.populateIFCCategories().then(() => {
          this.setupAllCategories();
        });
        this.loadIFCFile(this.ifcurl);
        return this.types;
      }
      )
      this.isErrorHappened = false;
    }, (progress) => {
      this.isLoading = true;
    },
      (error) => {
        this.isErrorHappened = true;
        console.log(error);
      });
    return;
  }

  public findAllChildrenTypes(c, parentid) {
    if (c.length != 0) {
      for (var i = 0; i < c.length; i++) {
        if (c[i].type != undefined || c[i].type != "undefined") {
          if (!this.types.find(o => o.type === c[i].type)) {
            this.levelOfType++;
            if (this.levelOfType > this.maxLevel) this.maxLevel = this.levelOfType + 1;
          }
          else {
            this.types.map((t) => {
              if (t.type == c[i].type) this.levelOfType = t.level;
            })
          }
          c[i].checked = true;
          c[i].level = this.levelOfType;
          c[i].levelIndex = i;
          c[i].parentID = parentid;
          c[i].parentExtracted = false;
          c[i].selfExtracted = false;
          this.types.push(c[i]);
        }
        this.findAllChildrenTypes(c[i].children, c[i].expressID);
      }
    }
    return;
  }

  public exractNextLevel(expressid, currentlevel) {
    console.log(currentlevel);
    if (currentlevel + 1 <= this.maxLevel) {
      this.nextLevelToExtract = currentlevel + 1;
      this.expressIDOfPreviousLevel = expressid;
      this.types.map((d) => {
        if (d.expressID == expressid) {
          if (d.selfExtracted == true) d.selfExtracted = false;
          else d.selfExtracted = true;
          if (d.children) {
            d.children.map((s) => {
              if (s.parentExtracted == false) s.parentExtracted = true;
              else s.parentExtracted = false;
            })
          }
        }
        if (d.level > currentlevel + 1 && d.parentExtracted == true) {
          d.parentExtracted = false;
        }
        if (d.level > currentlevel && d.selfExtracted == true) {
          d.selfExtracted = false;
        }
      });
    }
  }

  // to load ifc text
  public async loadIFCFile(url) {
    setTimeout(() => {
      this.loadingMessage = 'Fetching Metadata';
    }, 100);
    this.isLoading = true;
    this.http.get(url, { responseType: 'text' }).subscribe(async (data) => {
      this.ifcText = data;
      this.fetchMetadataFromIFC(data);
    });
  }


  //this will cast the ray and select the object
  cast(event: any) {
    const bound = this.canvas.getBoundingClientRect();
    const x1 = event.clientX - bound.left;
    const x2 = bound.right - bound.left;
    this.mouse.x = (x1 / x2) * 2 - 1;
    const y1 = event.clientY - bound.top;
    const y2 = bound.bottom - bound.top;
    this.mouse.y = -(y1 / y2) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(this.ifcModels);
  }

  public async populateIFCCategories() {
    for (var i in WEBIFC) {
      this.filteredTypes.map((c) => {
        if (c.type == (WEBIFC[i].type)) {
          this.allIFCCategories.push(WEBIFC[i]);
        }
      });
    }
  }

  async getAll(category) {
    return this.ifc.getAllItemsOfType(0, category, false);
  }

  async newSubsetOfType(category) {
    const ids = await this.getAll(category);
    var obj = this.ifc.createSubset({
      modelID: 0,
      ids,
      scene: this.scene,
      removePrevious: true,
      customID: category.toString()
    });
    this.objectToAdd.push(obj);
    return obj;
  }

  public subsets = {};

  async setupAllCategories() {
    this.allCategories = Object.values(this.allIFCCategories);
    for (let i = 0; i < this.allCategories.length; i++) {
      const category = this.allCategories[i];
      await this.setupCategory(category.value);
    }
    for (var i = 0; i < this.objectToAdd.length; i++) {
      this.scene.add(this.objectToAdd[i]);
    }
  }

  async setupCategory(category) {
    this.subsets[category] = await this.newSubsetOfType(category);
  }

  getName(category) {
    var type;
    this.allIFCCategories.map((c) => {
      if (c.value == category) type = c.type;
    });
    return type;
  }

  checkboxSelected(type, e, i) {
    this.types[i].checked = !this.types[i].checked;
    this.allCategories.map((data) => {
      if (data.type == type) {
        var uuidOfObjectToRemove = this.subsets[data.value].uuid;
        var objectToRemove = this.scene.getObjectByProperty('uuid', uuidOfObjectToRemove);
        if (e.target.checked) {
          this.objectToAdd.map((obj) => {
            if (obj.uuid == uuidOfObjectToRemove) this.scene.add(obj);
          });
        }
        else objectToRemove.removeFromParent();
      }
    })
  }

  //this will highlight on mouse hover
  highlightHover(event: any) {
    const found = this.cast(event)[0];
    if (found) {
      //@ts-ignore
      this.preselectModel.id = found.object.modelID;
      const index = found.faceIndex;
      //@ts-ignore
      const geometry = found.object.geometry;
      const id = this.ifc.getExpressId(geometry, index);
      this.selectedModelID = found.object.uuid;
      this.ifcLoader.ifcManager.createSubset({
        modelID: this.preselectModel.id,
        ids: [id],
        material: this.preselectMat,
        scene: this.scene,
        removePrevious: true
      });
      var hoverElemetType = this.parseElementDetailsFromIFCExpressID(id);
      return hoverElemetType;
    } else {
      this.ifc.removeSubset(this.preselectModel.id, this.preselectMat);
      return null;
    }
  }

  highlightSelect(event: any): number {
    this.resetAllDetails();
    const found = this.cast(event)[0];
    if (found) {
      //@ts-ignore
      this.selectModel.id = found.object.modelID;
      const index = found.faceIndex;
      //@ts-ignore
      const geometry = found.object.geometry;
      const id = this.ifc.getExpressId(geometry, index);
      this.expressID = id;
      this.selectedModelID = found.object.id;
      var subset = this.ifcLoader.ifcManager.createSubset({
        modelID: this.selectModel.id,
        ids: [id],
        material: this.selectMat,
        scene: this.scene,
        removePrevious: true
      });
      this.ifc.getItemProperties(this.selectModel.id, id).then((data: any) => {
        for (var x in data) {
          if (data[x] !== null && data[x] !== undefined) {
            if (data[x].value) {
              if (typeof (data[x].value) != 'number') {
                this.selectedItemProperties.push({
                  name: x,
                  value: data[x].value
                })
              }
              else if (typeof (data[x].value) == 'number' && data[x].type != 5) {
                this.selectedItemProperties.push({
                  name: x,
                  value: data[x].value
                })
              }
            }
            else if (data[x] !== null) {
              if (typeof (data[x]) != 'number') {
                if (x == 'expressID') {
                  this.selectedItemProperties.push({
                    name: x,
                    value: data[x]
                  })
                }
              }
            }
          }
        }
      });

      // get ifc type
      this.elementIfcType = this.ifc.getIfcType(this.selectModel.id, id);

      // get details of property sets
      this.ifc.getPropertySets(this.selectModel.id, id).then((data) => {
        for (var x in data) {
          var propertyList = [];
          if (data[x].Quantities) {
            for (var y in data[x].Quantities) {
              var elementDetails = this.parseElementDetailsFromIFCExpressID(data[x].Quantities[y].value);
              propertyList.push(elementDetails);
            }
          }
          if (data[x].HasProperties) {
            for (var y in data[x].HasProperties) {
              var elementDetails = this.parseElementDetailsFromIFCExpressID(data[x].HasProperties[y].value);
              propertyList.push(elementDetails);
            }
            this.selectedItemPropertySets.push({ propertyset: data[x].Name.value, data: propertyList })
          }
        }
      });
      this.showElementDetails(id);
      return id
    } else {
      this.ifc.removeSubset(this.selectModel.id, this.selectMat);
      this.elementDetailsModalOpen = false;
      this.elementIfcType = null;
      this.isLoading = false;
      this.loadingMessage = '';
      return null;
    }
  }

  public removeHighlight(): number {
    this.ifc.removeSubset(0, this.selectMat);
    this.ifc.removeSubset(0, this.preselectMat);
    return null;
  }

  public highlightByExpressID(id) {
    var subset = this.ifcLoader.ifcManager.createSubset({
      modelID: 0,
      ids: [id],
      material: this.selectMat,
      scene: this.scene,
      removePrevious: true
    });
    this.showElementDetails(id)
  }

  public highlightByHoveringOnElementType(id) {
    var subset = this.ifcLoader.ifcManager.createSubset({
      modelID: 0,
      ids: [id],
      material: this.preselectMat,
      scene: this.scene,
      removePrevious: true
    });
  }

  public parseElementDetailsFromIFCExpressID(id: number) {
    var expressId = '#' + id.toString() + '=';
    var lineIndex = this.ifcText.indexOf(expressId);
    var line = ''
    for (var l = lineIndex; l < l + 500; l++) {
      if (this.ifcText[l] == '\n' || this.ifcText[l] == '\r') break;
      else {
        line += this.ifcText[l];
      }
    }
    var returned;
    if (line.includes('IFCQUANTITY')) returned = this.parseIFCQUANTITY(line);
    else if (line.includes('IFCPROPERTYSINGLEVALUE')) returned = this.parseIFCPROPERTYSINGLEVALUE(line);
    else return {
      type: line.split(`(`)[0].replace(/[^a-zA-Z]/g, ``),
      expressId: id
    }
    return returned;
  }

  public parseIFCQUANTITY(templine: string) {
    var line1 = '';
    var propertyName = '';
    var propertyValue = '';
    var roundBracketCount = 0;
    var quoteCount = 0;
    var propertyCount = 0;
    for (var c = 0; c < templine.length; c++) {
      if (templine[c] == '(' && roundBracketCount == 0) {
        propertyCount++;
        roundBracketCount++;
      }
      else if (templine[c] == '(' && roundBracketCount > 0) {
        roundBracketCount++;
        line1 += templine[c];
      }
      else if (templine[c] == ')' && roundBracketCount == 1) {
        roundBracketCount--;
      }
      else if (templine[c] == ')' && roundBracketCount > 1) {
        roundBracketCount--;
        line1 += templine[c];
      }
      else if (templine[c] == `'` && quoteCount == 0) {
        quoteCount++;
      }
      else if (templine[c] == `'` && quoteCount > 0) {
        quoteCount--;
      }
      else if (templine[c] == ',' && roundBracketCount == 1 && quoteCount == 0) {
        propertyCount++;
        if (propertyCount == 2) {
          propertyName = line1;
          line1 = '';
        }
        else if (propertyCount == 5) {
          propertyValue = line1;
          line1 = '';
        }
      }
      else if (templine[c] == '$') { }
      else if (roundBracketCount > 0) {
        line1 += templine[c];
      }
    }
    if (propertyName == propertyValue) propertyValue = '';
    return {
      name: propertyName,
      value: propertyValue.replace(".F.", 'False').replace(".T.", 'True').replace(".U.", 'Unknown')
    };
  }

  public parseIFCPROPERTYSINGLEVALUE(line: string) {
    var propertyName = line.split('(')[1].split(',')[0];
    var propertyValue = line.split('(')[2].split(')')[0];
    if (propertyName == propertyValue) propertyValue = '';
    return {
      name: propertyName.replace(/'/g, ''),
      value: propertyValue.replace(/'/g, '').replace(".F.", 'False').replace(".T.", 'True').replace(".U.", 'Unknown'),
    };
  }

  public async showElementDetails(expressID: number) {
    this.resetAllDetails();
    this.elementDetailsModalOpen = true;

    await this.ifc.getItemProperties(this.ifcModelID, expressID).then((data) => {
      for (var x in data) {
        if (data[x] !== null && data[x] !== undefined) {
          if (data[x].value) {
            if (typeof (data[x].value) != 'number') {
              this.ifcTypesSelectedDetails.push({
                name: x,
                value: data[x].value
              });
            }
            else if (typeof (data[x].value) == 'number' && data[x].type != 5) {
              this.ifcTypesSelectedDetails.push({
                name: x,
                value: data[x].value
              });
            }
          }
          else if (data[x] !== null) {
            if (typeof (data[x]) != 'number') {
              if (x == 'expressID') {
                this.ifcTypesSelectedDetails.push({
                  name: x,
                  value: data[x]
                })
              }
            }
          }
        }
      }
    });
    await this.ifc.getPropertySets(this.ifcModelID, expressID).then((data) => {
      for (var x in data) {
        if (data[x].Quantities) {
          for (var y in data[x].Quantities) {
            var details = this.parseElementDetailsFromIFCExpressID(data[x].Quantities[y].value);
            this.ifcTypesSelectedDetails.push(details);
          }
        }
        if (data[x].HasProperties) {
          for (var y in data[x].HasProperties) {
            var details = this.parseElementDetailsFromIFCExpressID(data[x].HasProperties[y].value);
            this.ifcTypesSelectedDetails.push(details);
          }
        }
      }
    });
    this.elementIfcType = this.ifc.getIfcType(this.ifcModelID, expressID);
    return;
  }

  public fetchMetadataFromIFC(ifcText: string) {
    for (var x = 0; x < this.metaDataVariables.length; x++) {
      var lineIndex = ifcText.indexOf(this.metaDataVariables[x]);
      var line = '';
      for (var l = lineIndex; l < l + 10000; l++) {
        if (this.ifcText[l] == '\n' || this.ifcText[l] == '\r') break;
        else {
          line += this.ifcText[l];
        }
      }
      var pos = 0;
      var occurence = -1;
      var i = -1;
      while (pos != -1) {
        pos = ifcText.indexOf(this.metaDataVariables[x], i + 1);
        var lineIndex = pos;
        if (lineIndex != -1) {
          var line = '';
          for (var l = lineIndex; l < l + 10000; l++) {
            if (this.ifcText[l] == '\n' || this.ifcText[l] == '\r') break;
            else {
              line += this.ifcText[l];
            }
          }
          var foundFirstQuote = false;
          var value = '';
          for (var i = 0; i < line.length; i++) {
            if ((line[i] == `'` || line[i] == `"`)) {
              foundFirstQuote = !foundFirstQuote;
            }
            if (foundFirstQuote) {
              value += line[i]
            }
            if (line[i] == `$`) value += `'`;
          }
          switch (line.split("(")[0]) {
            case 'IFCORGANIZATION':
              this.IFCORGANIZATION.push({
                name: "Organization ID",
                value: value.split(`'`)[1]
              });
              this.IFCORGANIZATION.push({
                name: "Organization Name",
                value: value.split(`'`)[2]
              });
              this.IFCORGANIZATION.push({
                name: "Organization Description",
                value: value.split(`'`)[3]
              });
              break;
            case 'IFCAPPLICATION':
              this.IFCAPPLICATION.push({
                name: "Application Name",
                value: value.split(`'`)[2]
              });
              this.IFCAPPLICATION.push({
                name: "Application Version",
                value: value.split(`'`)[1]
              });
              this.IFCAPPLICATION.push({
                name: "Application Identifier",
                value: value.split(`'`)[3]
              });
              break;
            case 'IFCTELECOMADDRESS':
              this.IFCTELECOMADDRESS.push({
                name: "Contact Number",
                value: value.split(`'`)[4]
              });
              this.IFCTELECOMADDRESS.push({
                name: "Email ID",
                value: value.split(`'`)[7]
              });
              this.IFCTELECOMADDRESS.push({
                name: "Website",
                value: value.split(`'`)[8]
              });
              break;
            case 'IFCACTORROLE':
              this.IFCPERSON.push({
                "Actor Details": {
                  "Actor Role (User Defined)": value.split(`'`)[1],
                  "Actor Role Description": value.split(`'`)[2]
                }
              });
              this.IFCPERSON.push({
                name: "Actor Role (User Defined)",
                value: value.split(`'`)[1]
              });
              this.IFCPERSON.push({
                name: "Actor Role Description",
                value: value.split(`'`)[2]
              });
              break;
            case 'IFCPOSTALADDRESS':
              this.IFCPOSTALADDRESS.push({
                name: "Internal Location",
                value: value.split(`'`)[4]
              });
              this.IFCPOSTALADDRESS.push({
                name: "Address",
                value: value.split(`'`)[5]
              });
              this.IFCPOSTALADDRESS.push({
                name: "Postal Box Address",
                value: value.split(`'`)[6]
              });
              this.IFCPOSTALADDRESS.push({
                name: "Town",
                value: value.split(`'`)[7]
              });
              this.IFCPOSTALADDRESS.push({
                name: "Region",
                value: value.split(`'`)[8]
              });
              this.IFCPOSTALADDRESS.push({
                name: "Postal Code",
                value: value.split(`'`)[9]
              });
              this.IFCPOSTALADDRESS.push({
                name: "Country",
                value: value.split(`'`)[10]
              });
              break;
            case 'IFCPERSON':
              this.IFCPERSON.push({
                name: "ID",
                value: value.split(`'`)[1]
              });
              this.IFCPERSON.push({
                name: "Full Name",
                value: value.split(`'`)[5] + ' ' + value.split(`'`)[3] + ' ' + value.split(`'`)[4] + ' ' + value.split(`'`)[2] + ' ' + value.split(`'`)[6]
              });
              break;
            default:
              break;
          }
        }
        occurence += 1;
        i = pos;
      }
    }
    this.isLoading = false;
  }

  public makeHiddenVisible(event): void {
    const found = this.cast(event)[0];
    if (found) {
      //@ts-ignore
      this.selectModel.id = found.object.modelID;
      const index = found.faceIndex;
      //@ts-ignore
      const geometry = found.object.geometry;
      const id = this.ifc.getExpressId(geometry, index);
      this.ifcLoader.ifcManager.createSubset({
        modelID: this.selectModel.id,
        ids: [id],
        material: undefined,
        scene: this.scene,
        removePrevious: true
      });
    } else {
      this.ifc.removeSubset(this.selectModel.id, undefined);
    }
    return;
  }







}
