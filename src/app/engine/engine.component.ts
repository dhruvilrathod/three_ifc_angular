import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { NgZone, OnDestroy } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IFCLoader } from 'web-ifc-three';
import { IFCModel } from 'web-ifc-three/IFC/components/IFCModel';
import { HttpClient } from '@angular/common/http';
import * as WEBIFC from './categories.json';


@Component({
  selector: 'app-engine',
  templateUrl: './engine.component.html'
})
export class EngineComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('c1', { static: true })
  public rendererCanvas: ElementRef<HTMLCanvasElement>;

  // sample url
  // public ifcurl: string = 'http://127.0.0.1:5500/my_ifc1.ifc';
  // public ifcurl: string = './assets/Electrical Design.ifc';
  // public ifcurl: string = './assets/Architecture Design.ifc';

  public ifcurl: string;
  public ifcFileName: string;

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
  public hoveredObjectType;
  public selectedModelID: any = null;
  public ifcObjects: any;

  public elementListModalOpen: boolean = false;
  public elementDetailsModalOpen: boolean = false;
  public metadataModalOpen: boolean = false;
  public isControlPanelModalOpen: boolean = false;
  public isLoading: boolean = true;
  public loadingMessage: string = '';
  public isFullScreen: boolean = false;


  // IFC types list (from view)
  public allIFCCategories = [];
  public types = [];
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

  // ifc view control varialbes
  public isTranperentModel: boolean = false;
  public instructionModalOpen: boolean = false;
  public liveDetailsModal: boolean = true;
  public isAxesHelperOn: boolean = true;
  public isBasePlaneOn: boolean = true;
  public isLiveDetailsOn: boolean = true;
  public isErrorHappened: boolean = false;


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
    document.addEventListener('keydown', (e) => {
      console.log(this.isFullScreen, e.code);
      if(this.isFullScreen) {        
        if(e.code == 'Escape' || e.code == 'F11') this.isFullScreen = false;
      } 
    })
  }

  public ngAfterViewChecked(): void {
    // this.setupAllCategories();
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
    this.ifcurl = url;
    if (this.ifcurl != '' && this.ifcurl != null) {
      this.ifcFileName = this.ifcurl.substring(this.ifcurl.lastIndexOf('/') + 1).replace('%20', ' ');
      this.createScene(this.rendererCanvas).then(() => { this.loadIFC(this.ifcurl).then(() => this.animate()) });
    }
  }

  public loadIFCFile(url): void {
    console.log('load file function called');
    this.loadingMessage = 'Fetching Metadata';
    this.isLoading = true;
    this.http.get(url, { responseType: 'text' }).subscribe((data) => {
      // console.log(data);
      this.ifcText = data;
      this.fetchMetadataFromIFC(data);
    })
  }

  public doubleClickedEvent(e): void {
    this.highlightSelect(e);
  }

  public mouseOverEvent(e): void {
    if (this.isLiveDetailsOn) this.hoveredObjectType = this.highlightHover(e);
  }

  public onRemoveHighlight(): void {
    this.selectedObjectID = this.removeHighlight();
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
    this.isFullScreen = !this.isFullScreen;
    if (this.isFullScreen) {
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


  public resetEverything(): void {
    this.isTranperentModel = false;
    this.instructionModalOpen = false;
    this.liveDetailsModal = true;
    this.isAxesHelperOn = true;
    this.isBasePlaneOn = true;
    this.isControlPanelModalOpen = false;
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
  }

  public resetAllDetails() {
    this.ifcTypesSelectedDetails = [];
    this.allIFCCategories = [];
    this.selectedItemProperties = [];
    this.selectedItemPropertySets = [];
    this.elementIfcType = '';
  }

  public exitViewer() {
    this.allIFCCategories = [];
    this.IFCAPPLICATION = [];
    this.IFCORGANIZATION = [];
    this.IFCPOSTALADDRESS = [];
    this.IFCTELECOMADDRESS = [];
    this.IFCPERSON = [];
    this.types = [];
    this.isErrorHappened = false;
    this.ifcurl = null;
    this.ifcFileName = null;
    this.closeAllModals();
    this.resetEverything();
    window.location.reload();
  }

  // ********************* SERVICE CODE *************************************

  public async createScene(canvas: ElementRef<HTMLCanvasElement>) {
    this.loadingMessage = 'Creating the scene';
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
    this.camera.position.x = -10;
    this.camera.position.y = 5;
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
    this.loadingMessage = 'Loading IFC Model';
    this.isLoading = true;
    this.ifcLoader.ifcManager.setWasmPath('./assets/');
    this.ifcLoader.load(url, async (ifcModel: IFCModel) => {
      this.ifcModels.push(ifcModel);
      this.ifcModel = ifcModel;
      this.ifcModelID = ifcModel.modelID;

      // this is only when such option is given
      if (this.isTranperentModel) {
        ifcModel.visible = false;
        const modelCopy = new THREE.Mesh(
          ifcModel.geometry,
          new THREE.MeshLambertMaterial({
            transparent: true,
            opacity: 0.1,
            color: 0x77aaff
          }));
        // this.scene.add(modelCopy);
      }
      // else {
      // add to scene
      // this.scene.add(ifcModel);
      // }

      // not to add into scene
      this.boxHelper = new THREE.BoxHelper(ifcModel);
      this.box3.setFromObject(this.boxHelper);
      this.box3.getSize(this.boxSize);
      // this.scene.add(this.boxHelper);
      console.log(this.boxHelper);

      //spatial code
      this.spatialStructure = this.ifc.getSpatialStructure(this.ifcModel.modelID, false);
      this.spatialStructure.then((data: any) => {
        // console.log(data);
        console.log(data.children.length);
        if (data.children.length > 0) {
          data.checked = true;
          this.types.push(data);
          this.findAllChildrenTypes(data.children);
        }
        else console.log('Empty IFC selected');
        console.log(this.types);
        this.populateIFCCategories().then(() => {
          this.setupAllCategories();
        });
        return this.types;
      }
      )
      this.isErrorHappened = false;
      this.loadIFCFile(this.ifcurl);
    }, (progress) => console.log(progress), (error) => this.isErrorHappened = true);
    return;
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
    console.log('populate categories called');
    // console.log(WEBIFC);
    for (var i in WEBIFC) {
      this.types.map((c) => {
        if (c.type == (WEBIFC[i].type)) {
          console.log(WEBIFC[i].type);
          this.allIFCCategories.push(WEBIFC[i]);
        }
      });
    }
    console.log(this.allIFCCategories);
  }

  async getAll(category) {
    return this.ifc.getAllItemsOfType(0, category, false);
  }

  async newSubsetOfType(category) {
    console.log('newSubsetOfType called');
    const ids = await this.getAll(category);
    var obj = this.ifc.createSubset({
      modelID: 0,
      ids,
      scene: this.scene,
      removePrevious: true,
      customID: category.toString()
    });
    this.objectToAdd.push(obj);
    // this.scene.add(obj);
    return obj;
  }

  public subsets = {};

  async setupAllCategories() {
    console.log('setupcategories called');
    this.allCategories = Object.values(this.allIFCCategories);
    console.log(this.allCategories);
    for (let i = 0; i < this.allCategories.length; i++) {
      const category = this.allCategories[i];
      // console.log(category);
      await this.setupCategory(category.value);
    }
    for (var i = 0; i < this.objectToAdd.length; i++) {
      this.scene.add(this.objectToAdd[i]);
    }
  }

  async setupCategory(category) {
    this.subsets[category] = await this.newSubsetOfType(category);
    // this.setupCheckBox(category);
    console.log(this.subsets[category]);

  }

  getName(category) {
    var type;
    this.allIFCCategories.map((c) => {
      if (c.value == category) type = c.type;
    });
    return type;
  }

  setupCheckBox(category) {
    const name = this.getName(category);
    console.log(category);
    console.log(name);
    console.log(document.getElementById('IFCBEAM'));
    const checkBox = document.getElementById(name);
    checkBox.addEventListener('click', (event) => {
      const subset = this.subsets[category];
      console.log(subset);
      // this.scene.add(subset);
      // subset.removeFromParent();
    });
  }

  checkboxSelected(type, e, i) {
    this.types[i].checked = !this.types[i].checked;
    console.log(this.types);
    this.allCategories.map((data) => {
      if (data.type == type) {
        console.log(this.ifcModel);
        console.log(this.subsets[data.value]);
        var uuidOfObjectToRemove = this.subsets[data.value].uuid;
        console.log(uuidOfObjectToRemove);
        var objectToRemove = this.scene.getObjectByProperty('uuid', uuidOfObjectToRemove);
        console.log(objectToRemove);
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
      // console.log(hoverElemetType);
      return hoverElemetType;
    } else {
      this.ifc.removeSubset(this.preselectModel.id, this.preselectMat);
      return null;
    }
  }

  highlightSelect(event: any): number {
    this.resetAllDetails();
    this.isLoading = true;
    this.loadingMessage = 'Getting data';
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
      console.log(this.selectModel.id);
      var subset = this.ifcLoader.ifcManager.createSubset({
        modelID: this.selectModel.id,
        ids: [id],
        material: this.selectMat,
        scene: this.scene,
        removePrevious: true
      });
      console.log(this.ifc.getItemProperties(this.selectModel.id, id));
      console.log(this.ifc.getPropertySets(this.selectModel.id, id));
      console.log(this.ifc.getSpatialStructure(this.selectModel.id));
      this.ifc.getItemProperties(this.selectModel.id, id).then((data: any) => {
        console.log('ifc type: ', this.ifc.getIfcType(this.selectModel.id, id));
        for (var x in data) {
          if (data[x] !== null && data[x] !== undefined) {
            if (data[x].value) {
              // console.log(x, data[x].value, typeof (data[x].value));
              if (typeof (data[x].value) != 'number') {
                console.log('Useful ', x, data[x].value);
                this.selectedItemProperties.push({
                  name: x,
                  value: data[x].value
                })
              }
              else if (typeof (data[x].value) == 'number' && data[x].type != 5) {
                console.log('Useful ', x, data[x].value);
                this.selectedItemProperties.push({
                  name: x,
                  value: data[x].value
                })
              }
            }
            else if (data[x] !== null) {
              // console.log(x, data[x], typeof (data[x]));
              if (typeof (data[x]) != 'number') {
                if (x == 'expressID') {
                  console.log('Useful: ', data[x]);
                  this.selectedItemProperties.push({
                    name: x,
                    value: data[x]
                  })
                }
              }
            }
          }
        }
        console.log(this.selectedItemProperties);
      });

      // get ifc type
      this.elementIfcType = this.ifc.getIfcType(this.selectModel.id, id);
      console.log("Element Type: ", this.elementIfcType);

      // get details of property sets
      this.ifc.getPropertySets(this.selectModel.id, id).then((data) => {
        console.log(data);
        for (var x in data) {
          console.log('Propertyset name: ', data[x].Name.value);
          var propertyList = [];
          if (data[x].Quantities) {
            console.log('if 1 executed');
            for (var y in data[x].Quantities) {
              var elementDetails = this.parseElementDetailsFromIFCExpressID(data[x].Quantities[y].value);
              console.log((elementDetails));
              propertyList.push(elementDetails);
            }
          }
          if (data[x].HasProperties) {
            console.log('if 2 executed');
            for (var y in data[x].HasProperties) {
              var elementDetails = this.parseElementDetailsFromIFCExpressID(data[x].HasProperties[y].value);
              propertyList.push(elementDetails);
            }
            this.selectedItemPropertySets.push({ propertyset: data[x].Name.value, data: propertyList })
          }
          else console.log('No Properties found');
        }
        console.log(this.selectedItemPropertySets);
      });

      this.showElementDetails(id);
      return id;
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
    this.ifc.removeSubset(this.selectModel.id, this.selectMat);
    this.ifc.removeSubset(this.preselectModel.id, this.preselectMat);
    return null;
  }

  public parseElementDetailsFromIFCExpressID(id: number) {
    // console.log('element found function called');
    var expressId = '#' + id.toString() + '=';
    var lineIndex = this.ifcText.indexOf(expressId);
    var line = ''
    for (var l = lineIndex; l < l + 500; l++) {
      if (this.ifcText[l] == '\n' || this.ifcText[l] == '\r') break;
      else {
        line += this.ifcText[l];
      }
    }
    // console.log(line);
    var returned;
    if (line.includes('IFCQUANTITY')) returned = this.parseIFCQUANTITY(line);
    else if (line.includes('IFCPROPERTYSINGLEVALUE')) returned = this.parseIFCPROPERTYSINGLEVALUE(line);
    else return {
      type: line.split(`(`)[0].replace(/[^a-zA-Z]/g, ``),
      expressId: id
    }
    return returned;
  }

  public parseIFCQUANTITY(line: string) {
    // console.log('parseIFCQUANTITYLENGTH function called');
    var propertyName = line.split('(')[1].split(',')[0].replace(/[^a-zA-Z0-9 .]/g, "");
    var propertyDescription = line.split('(')[1].split(',')[1].replace("$", '');
    var propertyValue = line.split('(')[1].split(',')[3].replace(/[^a-zA-Z0-9 .]/g, "");
    if (propertyName == propertyValue) propertyValue = '';
    console.log(propertyName, propertyValue, propertyDescription);
    return {
      name: propertyName.replace(/'/g, ''),
      value: propertyValue.replace(/'/g, '').replace(".F.", 'False').replace(".T.", 'True').replace(".U.", 'Unknown'),
      description: propertyDescription
    };
  }

  public parseIFCPROPERTYSINGLEVALUE(line: string) {
    var propertyName = line.split('(')[1].split(',')[0];
    var propertyValue = line.split('(')[2].split(')')[0];
    if (propertyName == propertyValue) propertyValue = '';
    console.log(propertyName, propertyValue);
    return {
      name: propertyName.replace(/'/g, ''),
      value: propertyValue.replace(/'/g, '').replace(".F.", 'False').replace(".T.", 'True').replace(".U.", 'Unknown'),
    };
  }

  public showElementDetails(expressID: number): void {
    this.resetAllDetails();
    this.ifc.getItemProperties(this.ifcModelID, expressID).then((data) => {
      for (var x in data) {
        if (data[x] !== null && data[x] !== undefined) {
          if (data[x].value) {
            // console.log(x, data[x].value, typeof (data[x].value));
            if (typeof (data[x].value) != 'number') {
              // console.log('Useful ', x, data[x].value);
              this.ifcTypesSelectedDetails.push({
                name: x,
                value: data[x].value
              })
            }
            else if (typeof (data[x].value) == 'number' && data[x].type != 5) {
              // console.log('Useful ', x, data[x].value);
              this.ifcTypesSelectedDetails.push({
                name: x,
                value: data[x].value
              })
            }
          }
          else if (data[x] !== null) {
            // console.log(x, data[x], typeof (data[x]));
            if (typeof (data[x]) != 'number') {
              if (x == 'expressID') {
                // console.log('Useful: ', data[x]);
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
    this.ifc.getPropertySets(this.ifcModelID, expressID).then((data) => {
      console.log(data);
      for (var x in data) {
        console.log('Property name: ', data[x].Name.value);
        if (data[x].Quantities) {
          console.log('if 1 executed');
          for (var y in data[x].Quantities) {
            // console.log(data[x].Quantities[y].value);
            var details = this.parseElementDetailsFromIFCExpressID(data[x].Quantities[y].value);
            // console.log(details);
            this.ifcTypesSelectedDetails.push(details);
          }
        }
        if (data[x].HasProperties) {
          console.log('if 2 executed');
          for (var y in data[x].HasProperties) {
            var details = this.parseElementDetailsFromIFCExpressID(data[x].HasProperties[y].value);
            // console.log(details);
            this.ifcTypesSelectedDetails.push(details);
          }
        }
        else console.log('No Properties found');
      }
      console.log(this.ifcTypesSelectedDetails);
    });
    this.elementIfcType = this.ifc.getIfcType(this.ifcModelID, expressID);
    console.log('ifc type: ', this.elementIfcType);
    this.isLoading = false;
    this.loadingMessage = '';
    this.elementDetailsModalOpen = true;
    return;
  }


  public findAllChildrenTypes(c) {
    // console.log(c, this.types);
    if (c.length != 0) {
      for (var i = 0; i < c.length; i++) {
        if (c[i].type != undefined) {
          if (!this.types.find(o => o.type == c[i].type)) {
            c[i].checked = true;
            this.types.push(c[i]);
          }
        }
        this.findAllChildrenTypes(c[i].children);
      }
    }
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
      // console.log(line);
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
          // console.log(value);
          switch (line.split("(")[0]) {
            case 'IFCORGANIZATION':
              // this.ifcMetadata.push({
              //   "Organization Details": {
              //     "Organization ID": value.split(`'`)[1],
              //     "Organization Name": value.split(`'`)[2],
              //     "Organization Description": value.split(`'`)[3]
              //   }
              // });
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
              console.log('fetch IFCORGANIZATION: ------------');
              console.log('Organization ID:', value.split(`'`)[1]);
              console.log('Organization Name:', value.split(`'`)[2]);
              console.log('Organization Description:', value.split(`'`)[3]);
              break;
            case 'IFCAPPLICATION':
              // this.ifcMetadata.push({
              //   "Application Details": {
              //     "Application Name": value.split(`'`)[2],
              //     "Application Version": value.split(`'`)[1],
              //     "Application Identifier": value.split(`'`)[3]
              //   }
              // });
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
              console.log('fetch IFCAPPLICATION: ------------');
              console.log('Ifc application Name: ', value.split(`'`)[2]);
              console.log('Ifc application version: ', value.split(`'`)[1]);
              console.log('Ifc application idedntifier: ', value.split(`'`)[3]);
              break;
            case 'IFCTELECOMADDRESS':
              // this.ifcMetadata.push({
              //   "Contact Details:": {
              //     "Contact Number": value.split(`'`)[4],
              //     "Email ID": value.split(`'`)[7],
              //     "Website": value.split(`'`)[8]
              //   }
              // });
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
              console.log('fetch IFCTELECOMADDRESS: ------------');
              console.log('Ifc contact number Name: ', value.split(`'`)[4]);
              console.log('Ifc contact email: ', value.split(`'`)[7]);
              console.log('Ifc website: ', value.split(`'`)[8]);
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
              console.log('fetch IFCACTORROLE: ------------');
              console.log('ifc actor role (userdefined): ', value.split(`'`)[1]);
              console.log('ifc actor role description: ', value.split(`'`)[2]);
              break;
            case 'IFCPOSTALADDRESS':
              // this.IFCPOSTALADDRESS.push({
              //   "Address Details": {
              //     "Internal Location": value.split(`'`)[4],
              //     "Address": value.split(`'`)[5],
              //     "Postal Box Address": value.split(`'`)[6],
              //     "Twon": value.split(`'`)[7],
              //     "Region": value.split(`'`)[8],
              //     "Postal Code": value.split(`'`)[9],
              //     "Country": value.split(`'`)[10]
              //   }
              // });
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
              console.log('fetch IFCPOSTALADDRESS: ------------');
              console.log(value);
              console.log('internal location: ', value.split(`'`)[4]);
              console.log('address: ', value.split(`'`)[5]);
              console.log('postal box: ', value.split(`'`)[6]);
              console.log('town: ', value.split(`'`)[7]);
              console.log('region: ', value.split(`'`)[8]);
              console.log('postal code: ', value.split(`'`)[9]);
              console.log('country: ', value.split(`'`)[10]);
              break;
            case 'IFCPERSON':
              // this.ifcMetadata.push({
              //   "Person Details": {
              //     "ID": value.split(`'`)[1],
              //     "Full Name": value.split(`'`)[5] + ' ' + value.split(`'`)[3] + ' ' + value.split(`'`)[4] + ' ' + value.split(`'`)[2] + ' ' + value.split(`'`)[6],
              //   }
              // });
              this.IFCPERSON.push({
                name: "ID",
                value: value.split(`'`)[1]
              });
              this.IFCPERSON.push({
                name: "Full Name",
                value: value.split(`'`)[5] + ' ' + value.split(`'`)[3] + ' ' + value.split(`'`)[4] + ' ' + value.split(`'`)[2] + ' ' + value.split(`'`)[6]
              });
              console.log('fetch IFCPERSON: ------------');
              console.log('Full Name: ', value.split(`'`)[3] + ' ' + value.split(`'`)[4] + ' ' + value.split(`'`)[2]);
              console.log('ID: ', value.split(`'`)[1]);
              break;
            default:
              break;
          }
        }
        occurence += 1;
        i = pos;
      }
      // console.log('occurence of IFCORGANIZATION: ', occurence);         
    }
    // console.log(this.IFCAPPLICATION);
    // console.log(this.IFCORGANIZATION);
    // console.log(this.IFCPOSTALADDRESS);
    // console.log(this.IFCTELECOMADDRESS);
    // console.log(this.IFCPERSON);
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
