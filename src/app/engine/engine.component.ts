import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { EngineService } from './engine.service';

@Component({
  selector: 'app-engine',
  templateUrl: './engine.component.html'
})
export class EngineComponent implements OnInit {

  @ViewChild('c1', { static: true })
  public rendererCanvas: ElementRef<HTMLCanvasElement>;

  public constructor(
    private engine: EngineService,
    ) { }

  public ngOnInit(): void {
    this.engine.createScene(this.rendererCanvas);
    this.engine.animate();
  }

  public ifcFileSelected(e: any): void {
    console.log(e.target.files[0]);
    console.log(URL.createObjectURL(e.target.files[0]));
    // if (e.target.files && e.target.files[0]) {
    //   console.log('if executed');
    //   this.engine.loadIFC(e.target.files[0]);
    //   const reader = new FileReader();
    //   reader.onload = (event) => {
    //     // console.log(event);
        
    //   }
    //   reader.readAsText(e.target.files[0]);
    // }
  }

}
