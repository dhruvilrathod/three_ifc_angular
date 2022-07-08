# Web IFC Viewer/Renderer
#### _Online web-based IFC file viwer_

Web IFC Viewer is an online platform which allows users to load and view IFC files.
User can:
- Paste a link of IFC file
- Upload IFC file from local computer
- Play around with an example

# Features

- Live Details of IFC element on mouse hover
- See the list of all element types in the IFC
- See through IFC model by turning particular element type ON/OFF
- Click on the IFC element type to see details
- Extract element tree structure of IFC model
- Hover on the tree element to highlight that part in model
- Get metadata details about IFC file
- Control Panel to control the view
- Reset or Exit the Viewer itself.
- Go fullscreen
- Search anything in the model including IFC element type, express id, property name or value

Web IFC Viewer is a lightweight IFC viewer based on the basic concepts of 3D calculation.
It uses the open source Web 3D library [Three.js](https://threejs.org/) and Web IFC loader of [web-ifc-three](https://ifcjs.github.io/info/docs/Guide/web-ifc-three/Introduction/)

> The Search functionality, however, is currently totally dependent on browser, hence it might freeze the screen the screen until the result of the search arrives. USE  IT CAREFULLY!

## Tech-Stack

Web IFC Viewer/Renderer uses a number of open source projects to work properly:

- [Angular](https://angular.io/) - HTML enhanced for web apps
- [Tailwind](https://tailwindcss.com/) - Great UI boilerplate for modern web apps
- [Node.js](https://nodejs.org/en/) - Temporary I/O for the backend
- [Express](https://expressjs.com/) - Fast node.js network app framework
- [Three.js](https://threejs.org/) - JavaScript 3D library
- [IFC.js](https://ifcjs.github.io/info/docs/Guide/web-ifc-three/Introduction/) - Official IFC loader of Three.js
