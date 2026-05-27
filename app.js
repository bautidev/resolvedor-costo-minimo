let nombresOrigenes = [];
let nombresDestinos = [];

function formatearNumero(numero) {
  return Number.isInteger(numero) ? numero.toString() : numero.toFixed(2);
}

function formatearCosto(numero) {
  return '$' + numero.toFixed(2);
}

function generarFormulario() {
  const cantidadOrigenes = parseInt(document.getElementById('numOrigines').value);
  const cantidadDestinos = parseInt(document.getElementById('numDestinos').value);
  const mensajeError = document.getElementById('errDim');

  if (isNaN(cantidadOrigenes) || cantidadOrigenes < 1 || isNaN(cantidadDestinos) || cantidadDestinos < 1) {
    mensajeError.textContent = 'Ingresa valores válidos mayores a 0.';
    mensajeError.classList.add('visible');
    return;
  }
  mensajeError.classList.remove('visible');

  nombresOrigenes = Array.from({ length: cantidadOrigenes }, (_, i) => `O${i + 1}`);
  nombresDestinos = Array.from({ length: cantidadDestinos }, (_, j) => `D${j + 1}`);

  renderTablaOrigenes(cantidadOrigenes);
  renderTablaDestinos(cantidadDestinos);
  renderCostMatrix(cantidadOrigenes, cantidadDestinos);

  document.getElementById('seccionNodos').classList.remove('hidden');
  document.getElementById('resultado').classList.add('hidden');
}

function renderTablaOrigenes(cantidadOrigenes) {
  const tablaOrigenes = document.getElementById('tablaOrigenes');
  let html = '<tr><th>Nombre</th><th>Oferta</th></tr>';

  for (let i = 0; i < cantidadOrigenes; i++) {
    html += `
      <tr>
        <td><input type="text" class="nombre-origen" data-index="${i}" value="O${i + 1}"></td>
        <td><input type="number" class="valor-oferta" min="0" placeholder="0"></td>
      </tr>`;
  }

  tablaOrigenes.innerHTML = html;

  tablaOrigenes.querySelectorAll('.nombre-origen').forEach(input => {
    input.addEventListener('input', function () {
      const idx = parseInt(this.dataset.index);
      nombresOrigenes[idx] = this.value || `O${idx + 1}`;
      refreshHeaders();
    });
  });
}

function renderTablaDestinos(cantidadDestinos) {
  const tablaDestinos = document.getElementById('tablaDestinos');
  let html = '<tr><th>Nombre</th><th>Demanda</th></tr>';

  for (let j = 0; j < cantidadDestinos; j++) {
    html += `
      <tr>
        <td><input type="text" class="nombre-destino" data-index="${j}" value="D${j + 1}"></td>
        <td><input type="number" class="valor-demanda" min="0" placeholder="0"></td>
      </tr>`;
  }

  tablaDestinos.innerHTML = html;

  tablaDestinos.querySelectorAll('.nombre-destino').forEach(input => {
    input.addEventListener('input', function () {
      const idx = parseInt(this.dataset.index);
      nombresDestinos[idx] = this.value || `D${idx + 1}`;
      refreshHeaders();
    });
  });
}

function renderCostMatrix(cantidadOrigenes, cantidadDestinos) {
  const matrizCostos = document.getElementById('costMatrix');

  let html = '<thead><tr><th></th>';
  for (let j = 0; j < cantidadDestinos; j++) {
    html += `<th class="h-dest">${nombresDestinos[j]}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let i = 0; i < cantidadOrigenes; i++) {
    html += `<tr><td class="row-lbl r-orig">${nombresOrigenes[i]}</td>`;
    for (let j = 0; j < cantidadDestinos; j++) {
      html += `<td><input type="number" class="costo-celda" data-row="${i}" data-col="${j}" min="0" step="0.01"></td>`;
    }
    html += '</tr>';
  }

  matrizCostos.innerHTML = html + '</tbody>';
}

function refreshHeaders() {
  document.querySelectorAll('.h-dest').forEach((encabezado, j) => {
    encabezado.textContent = nombresDestinos[j];
  });
  document.querySelectorAll('.r-orig').forEach((etiqueta, i) => {
    etiqueta.textContent = nombresOrigenes[i];
  });
}

function ejecutarProceso() {
  let origenes = Array.from(document.querySelectorAll('.valor-oferta')).map((input, i) => ({
    nombre: nombresOrigenes[i],
    oferta: parseFloat(input.value) || 0
  }));

  let destinos = Array.from(document.querySelectorAll('.valor-demanda')).map((input, j) => ({
    nombre: nombresDestinos[j],
    demanda: parseFloat(input.value) || 0
  }));

  let costos = Array.from({ length: origenes.length }, () => Array(destinos.length).fill(0));
  document.querySelectorAll('.costo-celda').forEach(input => {
    costos[parseInt(input.dataset.row)][parseInt(input.dataset.col)] = parseFloat(input.value) || 0;
  });

  const totalOferta = origenes.reduce((acum, origen) => acum + origen.oferta, 0);
  const totalDemanda = destinos.reduce((acum, destino) => acum + destino.demanda, 0);

  const mensajeError = document.getElementById('errCalc');
  if (totalOferta <= 0 || totalDemanda <= 0) {
    mensajeError.textContent = 'La oferta y la demanda deben ser mayores a 0.';
    mensajeError.classList.add('visible');
    return;
  }
  mensajeError.classList.remove('visible');

  const mensajeAviso = document.getElementById('warnCalc');
  const diferencia = Math.abs(totalOferta - totalDemanda);
  if (diferencia > 0.0001) {
    mensajeAviso.textContent = `Problema desbalanceado. Se agrega nodo ficticio (diferencia: ${formatearNumero(diferencia)}).`;
    mensajeAviso.classList.add('visible');
  } else {
    mensajeAviso.classList.remove('visible');
  }

  if (totalOferta > totalDemanda + 0.0001) {
    destinos.push({ nombre: 'Ficticio', demanda: totalOferta - totalDemanda });
    costos.forEach(fila => fila.push(0));
  } else if (totalDemanda > totalOferta + 0.0001) {
    origenes.push({ nombre: 'Ficticio', oferta: totalDemanda - totalOferta });
    costos.push(new Array(destinos.length).fill(0));
  }

  const ofertaRestante = origenes.map(origen => origen.oferta);
  const demandaRestante = destinos.map(destino => destino.demanda);
  const asignaciones = [];
  const filaEliminada = new Array(origenes.length).fill(false);
  const colEliminada = new Array(destinos.length).fill(false);

  while (true) {
    let minCosto = Infinity;
    let minFila = -1, minCol = -1;

    for (let i = 0; i < origenes.length; i++) {
      if (filaEliminada[i]) continue;
      for (let j = 0; j < destinos.length; j++) {
        if (colEliminada[j]) continue;
        if (costos[i][j] < minCosto) {
          minCosto = costos[i][j];
          minFila = i;
          minCol = j;
        }
      }
    }

    if (minFila === -1) break;

    const cantidad = Math.min(ofertaRestante[minFila], demandaRestante[minCol]);
    asignaciones.push({ fila: minFila, col: minCol, cantidad, costo: costos[minFila][minCol] });

    ofertaRestante[minFila] -= cantidad;
    demandaRestante[minCol] -= cantidad;

    if (ofertaRestante[minFila] <= 0.0001 && demandaRestante[minCol] <= 0.0001) {
      filaEliminada[minFila] = true;
      colEliminada[minCol] = true;
    } else if (ofertaRestante[minFila] <= 0.0001) {
      filaEliminada[minFila] = true;
    } else {
      colEliminada[minCol] = true;
    }
  }

  let costoTotal = 0;
  let htmlResultado = `
    <thead>
      <tr>
        <th>Origen \\ Destino</th>
        ${destinos.map(destino => `<th>${destino.nombre}</th>`).join('')}
        <th>Oferta</th>
      </tr>
    </thead>
    <tbody>`;

  for (let fila = 0; fila < origenes.length; fila++) {
    htmlResultado += `<tr><td class="row-head">${origenes[fila].nombre}</td>`;

    for (let col = 0; col < destinos.length; col++) {
      const asignacion = asignaciones.find(a => a.fila === fila && a.col === col);
      if (asignacion && asignacion.cantidad > 0) {
        costoTotal += asignacion.cantidad * asignacion.costo;
        htmlResultado += `
          <td class="assigned">
            <span class="cell-cost">${formatearCosto(asignacion.costo)}</span>
            <span class="cell-qty">${formatearNumero(asignacion.cantidad)}</span>
          </td>`;
      } else {
        htmlResultado += `<td><span class="cell-empty">${formatearCosto(costos[fila][col])}</span></td>`;
      }
    }

    htmlResultado += `<td style="font-weight:600">${formatearNumero(origenes[fila].oferta)}</td></tr>`;
  }

  htmlResultado += `
    <tr>
      <td class="row-head">Demanda</td>
      ${destinos.map(destino => `<td style="font-weight:600">${formatearNumero(destino.demanda)}</td>`).join('')}
      <td>${formatearNumero(Math.max(totalOferta, totalDemanda))}</td>
    </tr>
    </tbody>`;

  document.getElementById('tablaResultado').innerHTML = htmlResultado;
  document.getElementById('zValue').textContent = formatearCosto(costoTotal);

  document.getElementById('listaAsig').innerHTML = asignaciones
    .filter(asignacion => asignacion.cantidad > 0)
    .map(asignacion => `
      <div class="asig-item">
        <div class="asig-route">
          <strong>${origenes[asignacion.fila].nombre}</strong>
          <span class="arrow">→</span>
          <strong>${destinos[asignacion.col].nombre}</strong>
        </div>
        <span class="asig-cost">${formatearNumero(asignacion.cantidad)} × ${formatearCosto(asignacion.costo)} = ${formatearCosto(asignacion.cantidad * asignacion.costo)}</span>
      </div>`)
    .join('');

  const seccionResultado = document.getElementById('resultado');
  seccionResultado.classList.remove('hidden');
  seccionResultado.scrollIntoView({ behavior: 'smooth' });
}
