function stringToHash(string) {
    let hash = 0;

    if (string.length === 0) {
        return hash;
    }

    for (let i = 0; i < string.length; i++) {
        char = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    return hash;
}

function getElemProperty(el, prop) {
    return window.getComputedStyle(el).getPropertyValue(prop);
}

function elementWidth(el) {
    return parseInt(getElemProperty(el, 'width').replace('px', ''));
}

function elementHeight(el) {
    return parseInt(getElemProperty(el, 'height').replace('px', ''));
}

function toArray(array_like) {
    return Array.prototype.slice.call(array_like);
}

function loadImageAndAddToDOM(file, stretch, cb) {
    const reader = new FileReader();
    reader.onload = (e) => {
        let img = document.createElement('img');
        img.src = e.target.result;
        img.height = 128;
        if (stretch)
            img.width = 128;
        img.setAttribute('id', stringToHash(img.src));
        img.setAttribute('draggable', 'true');

        img.addEventListener('click', (ev) => {
            ev.target.parentElement.removeChild(ev.target);
        });
        img.addEventListener('dragstart', (ev) => {
            ev.dataTransfer.setData('text/plain', ev.target.id);
        });

        cb(img);
    };
    reader.readAsDataURL(file);
}

function preventDefault(ev) {
    ev.preventDefault();
    ev.stopPropagation();
}