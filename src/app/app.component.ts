import { AfterViewInit, OnInit, Component, ElementRef, ViewChild } from '@angular/core';
import { linkTools, elementTools, dia, shapes, highlighters } from '@joint/plus';
import { Node, Edge } from '../shared/shapes';
import ResizeTool from '../shared/resize-tool';
import { AvoidRouter } from '../shared/avoid-router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvas: ElementRef;

  private graph: dia.Graph;
  private paper: dia.Paper;

  public async ngOnInit(): Promise<any> {
    const cellNamespace = {
      ...shapes,
      Node,
      Edge,
    };

    const graph = this.graph = new dia.Graph({}, { cellNamespace });
    const paper = this.paper = new dia.Paper({
      model: graph,
      cellViewNamespace: cellNamespace,
      width: 1000,
      height: 600,
      gridSize: 10,
      interactive: { linkMove: false },
      linkPinning: false,
      async: true,
      frozen: true,
      background: { color: '#F3F7F6' },
      snapLinks: { radius: 30 },
      overflow: true,
      defaultConnector: {
        name: 'straight',
        args: {
          cornerType: 'cubic',
          cornerRadius: 4,
        },
      },
      highlighting: {
        default: {
          name: 'mask',
          options: {
            padding: 2,
            attrs: {
              stroke: '#EA3C24',
              strokeWidth: 2,
            },
          },
        },
      },
      defaultLink: () => new Edge(),
      validateConnection: (
        sourceView,
        sourceMagnet,
        targetView,
        targetMagnet,
        end
      ) => {
        const source = sourceView.model as dia.Element;
        const target = targetView.model as dia.Element;
        if (source.isLink() || target.isLink()) return false;
        if (targetMagnet === sourceMagnet) return false;
        if (end === 'target' ? targetMagnet : sourceMagnet) {
            return true;
        }
        if (source === target) return false;
        return end === 'target' ? !target.hasPorts() : !source.hasPorts();
      },
    });

  // Add tools to the elements.
  graph.getElements().forEach((el) => addElementTools(el, paper));
  graph.on('add', (cell) => {
    if (cell.isLink()) return;
    addElementTools(cell, paper);
  });

  function addElementTools(el: dia.Element, paper: dia.Paper) {
    const tools = [
      new ResizeTool({
        selector: 'body',
      }),
      new elementTools.Remove({
        useModelGeometry: true,
        x: -10,
        y: -10,
      }),
    ];
    if (!el.hasPorts()) {
      tools.push(
        new elementTools.Connect({
          useModelGeometry: true,
          x: 'calc(w + 10)',
          y: 'calc(h - 20)',
        })
      );
    }

    el.findView(paper).addTools(new dia.ToolsView({ tools }));
  }

  // Add tools to the links.
  paper.on('link:mouseenter', (linkView) => {
    linkView.addTools(
      new dia.ToolsView({
        tools: [
          new linkTools.Remove(),
          new linkTools.TargetArrowhead(),
        ],
      })
    );
  });

  paper.on('link:mouseleave', (linkView) => {
    linkView.removeTools();
  });

  paper.on('blank:pointerdblclick', (evt, x, y) => {
    const node = new Node({
      position: { x: x - 50, y: y - 50 },
      size: { width: 100, height: 100 },
    });
    graph.addCell(node);
  });

  // Add a class to the links when they are being interacted with.
  // See `styles.css` for the styles.

  paper.on('link:pointerdown', (linkView) => {
    highlighters.addClass.add(linkView, 'line', 'active-link', {
      className: 'active-link'
    });
  });

  paper.on('link:pointerup', (linkView) => {
    highlighters.addClass.remove(linkView);
  });
  }

  public ngAfterViewInit(): void {
    const { canvas, graph, paper } = this;

    const c1 = new Node({
      position: { x: 100, y: 100 },
      size: { width: 100, height: 100 },
      ports: {
        items: [
          {
            group: 'top',
            id: 'port1',
          },
          {
            group: 'top',
            id: 'port2',
          },
          {
            group: 'right',
            id: 'port3',
          },
          {
            group: 'left',
            id: 'port4',
            // TODO: we need to redefine the port on element resize
            // The port is currently defined proportionally to the element size.
            // args: {
            //     dy: 30
            // }
          },
        ],
      },
    });

    const c2 = c1.clone().set({
      position: { x: 300, y: 300 },
      size: { width: 100, height: 100 },
    });

    const c3 = c1.clone().set({
      position: { x: 500, y: 100 },
      size: { width: 100, height: 100 },
    });

    const c4 = new Node({
      position: { x: 100, y: 400 },
      size: { width: 100, height: 100 },
    });

    const c5 = c4.clone().set({
      position: { x: 500, y: 300 },
      size: { width: 100, height: 100 },
    });

    const l1 = new Edge({
      source: { id: c1.id, port: 'port4' },
      target: { id: c2.id, port: 'port4' },
    });

    const l2 = new Edge({
      source: { id: c2.id, port: 'port2' },
      target: { id: c3.id, port: 'port4' },
    });

    const l3 = new Edge({
      source: { id: c4.id },
      target: { id: c5.id },
    });

    const l4 = new Edge({
      source: { id: c5.id },
      target: { id: c4.id },
    });

    graph.addCells([c1, c2, c3, c4, c5, l1, l2, l3, l4]);

    canvas.nativeElement.appendChild(paper.el);

    paper.unfreeze();
    paper.fitToContent({
      useModelGeometry: true,
      padding: 100,
      allowNewOrigin: 'any',
    });

    // Start the Avoid Router.
    const router = new AvoidRouter(graph, {
      shapeBufferDistance: 20,
      idealNudgingDistance: 10,
      portOverflow: 10,
    });
    router.addGraphListeners();
    router.routeAll();
  }
}
