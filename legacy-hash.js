/* Enlaces antiguos de la preventa (raíz#seccion) → niebla/#seccion */
(function () {
  var ids = ["portada", "colab", "tostador", "cafe", "top"];
  var h = location.hash.slice(1);
  if (ids.indexOf(h) !== -1) location.replace("niebla/#" + h);
})();
