/**
 * # The MIT License (MIT)
 *
 * Copyright (c) Go Make Things, LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Repo : https://github.com/cferdinandi/saferInnerHTML
 */

interface IAttribute {
  att: string;
  value: string;
}

interface IDomMap {
  content: string | null;
  atts: IAttribute[];
  type: string;
  children: IDomMap[];
}

export const saferHTML = (app: HTMLElement, template: string, append?: boolean) => {
  // Don't run if there's no element to inject into
  if (!app) throw new Error('safeInnerHTML: Please provide a valid element to inject content into');

  // Render the template into the DOM
  renderToDOM(createDOMMap(stringToHTML(template)), app, append);
};

/**
 * Convert a template string into HTML DOM nodes
 * @param  {String} str The template string
 * @return {Node}       The template HTML
 */
function stringToHTML(str: string): HTMLElement {
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, 'text/html');
  return doc.body;
}

/**
 * Add attributes to an element
 * @param {Node}  elem The element
 * @param {Array} atts The attributes to add
 */
function addAttributes(elem: HTMLElement, atts: IAttribute[]) {
  atts.forEach((attribute) => {
    // If the attribute is a class, use className
    // Else if it starts with `data-`, use setAttribute()
    // Otherwise, set is as a property of the element
    if (attribute.att === 'class') {
      elem.className = attribute.value;
    } else if (attribute.att.slice(0, 5) === 'data-') {
      elem.setAttribute(attribute.att, attribute.value || '');
    } else {
      elem[attribute.att] = attribute.value || '';
    }
  });
}

/**
 * Create an array of the attributes on an element
 * @param  {NamedNodeMap} attributes The attributes on an element
 * @return {Array}                   The attributes on an element as an array of key/value pairs
 */
function getAttributes(attributes: NamedNodeMap): IAttribute[] {
  return Array.from(attributes).map((attribute) => {
    return {
      att: attribute.name,
      value: attribute.value,
    };
  });
}

/**
 * Make an HTML element
 * @param  {Object} elem The element details
 * @return {Node}        The HTML element
 */
function makeElem(elem: IDomMap): HTMLElement | Text {
  // Create the element
  const node =
    elem.type === 'text'
      ? document.createTextNode(elem.content)
      : document.createElement(elem.type);

  // Add attributes
  if (node instanceof HTMLElement) {
    addAttributes(node, elem.atts);
  }

  // If the element has child nodes, create them
  // Otherwise, add textContent
  if (elem.children.length > 0) {
    elem.children.forEach((childElem) => {
      node.appendChild(makeElem(childElem));
    });
  } else if (elem.type !== 'text') {
    node.textContent = elem.content;
  }

  return node;
}

/**
 * Render the template items to the DOM
 * @param  {Array} map A map of the items to inject into the DOM
 */
function renderToDOM(map: IDomMap[], app: HTMLElement, append: boolean) {
  if (!append) {
    while (app.firstChild) {
      app.removeChild(app.firstChild);
    }
  }
  map.forEach((node) => {
    app.appendChild(makeElem(node));
  });
}

/**
 * Create a DOM Tree Map for an element
 * @param  {Node}   element The element to map
 * @return {Array}          A DOM tree map
 */
function createDOMMap(element: HTMLElement): IDomMap[] {
  const map: IDomMap[] = [];
  Array.from(element.childNodes).forEach((node) => {
    map.push({
      content: node.childNodes && node.childNodes.length > 0 ? null : node.textContent,
      atts: node.nodeType === 3 ? [] : getAttributes((<HTMLElement>node).attributes),
      type: node.nodeType === 3 ? 'text' : (<HTMLElement>node).tagName.toLowerCase(),
      children: createDOMMap(<HTMLElement>node),
    });
  });
  return map;
}
