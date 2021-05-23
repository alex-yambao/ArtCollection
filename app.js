const STATE = {
  BASE_URL: "https://api.harvardartmuseums.org",
  KEY: "apikey=d09e44c6-3404-41fc-8716-cab1bc77f210",
  DATA: [],
  CLASSIFICATIONS: [],
  CENTURIES: [],
};

//fetch Data
async function fetchObjects() {
  const url = `${STATE.BASE_URL}/object?${STATE.KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    STATE.DATA = data.records;
    return data;
  } catch (error) {
    console.error(error);
  }
}

async function fetchAllCenturies() {
  const queryParam = "&size=100&sort=temporalorder";
  const url = `${STATE.BASE_URL}/century?${STATE.KEY}${queryParam}`;
  localStorage.getItem("centuries")
    ? JSON.parse(localStorage.getItem("centuries"))
    : null;
  try {
    const response = await fetch(url);
    const { data, records } = await response.json();
    STATE.CENTURIES = records;
    localStorage.setItem("centuries", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  }
}

async function fetchAllClassifications() {
  const queryParam = "&size=100&sort=name";
  const url = `${STATE.BASE_URL}/classification?${STATE.KEY}${queryParam}`;
  localStorage.getItem("classifications")
    ? JSON.parse(localStorage.getItem("classifications"))
    : null;
  try {
    const response = await fetch(url);
    const { data, records } = await response.json();
    STATE.CLASSIFICATIONS = records;
    localStorage.setItem("classifications", JSON.stringify(records));
    return records;
  } catch (error) {
    console.error(error);
  }
}

async function prefetchCategoryLists() {
  try {
    const [classifications, centuries] = await Promise.all([
      fetchAllClassifications(),
      fetchAllCenturies(),
    ]);
    $(".classification-count").text(`(${classifications.length})`);
    classifications.forEach((classification) => {
      $("#select-classification").append(
        $(`<option value="${classification.name}">${classification.name}</option>`)
      );
    });

    $(".century-count").text(`(${centuries.length}))`);

    centuries.forEach((century) => {
      $("#select-century").append(
        $(`<option value="${century.name}">${century.name}</option>`)
      );
    });
  } catch (error) {
    console.error(error);
  }
}

function buildSearchString() {
  const classification = $("#select-classification").val();
  const century = $("#select-century").val();
  const keyword = $("#keywords").val();
  return `${STATE.BASE_URL}/object?${STATE.KEY}&classification=${classification}&century=${century}&keyword=${keyword}`;
}

function onFetchStart() {
  $("#loading").addClass("active");
}

function onFetchEnd() {
  $("#loading").removeClass("active");
}

function searchURL(searchType, searchString) {
  return `${STATE.BASE_URL}/object?${STATE.KEY}&${searchType}=${searchString}`;
}

function factHTML(title, content, searchTerm = null) {
  if (!content) {
    return ""
  } 
  const obj = 
  `<span class="title">${title}</span><span class="content">${searchTerm && content ? 
  `<a href="${STATE.BASE_URL}/object?${STATE.KEY}&${searchTerm}=${encodeURI(content.split("-").join("|"))}">${content}</a>`
    : content} 
    </span>`
  return obj;
}


function photosHTML(images, primaryimageurl) {
  if (images && images.length > 0) {
    return images.map((image) => `<img src = "${image.baseimageurl}" />`).join("");
  } else if (primaryimageurl) {
    return `<img src = " ${primaryimageurl} />`;
  } else {
    return "";
  }
}
//event listeners

$("#search").on("submit", async function (event) {
  event.preventDefault();
  onFetchStart();
  try {
    const url = buildSearchString();
    const encodedUrl = encodeURI(url);
    const response = await fetch(encodedUrl);
    const { info, records } = await response.json();
    updatePreview(records, info);
    return { info, records };
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

$("#preview .next, #preview .previous").on("click", async function () {
  onFetchStart();
  const url = $(this).data("url");
  try {
    const response = await fetch(url);
    const { info, records } = await response.json();
    updatePreview(records, info);
    return { info, records };
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

$("#preview").on("click", ".object-preview", function (event) {
  event.preventDefault();
  const previewObj = $(event.target).closest(".object-preview");
  const objRecord = previewObj.data("record");
  $("#feature").html(renderFeature(objRecord));
});

$("#feature").on("click", "a", async function (event) {
  const href = $(this).attr("href");
  if (href.startsWith("mailto")) {
    return;
  }
  event.preventDefault();
  onFetchStart();
  try {
    const response = await fetch(href);
    const {records, data} = await response.json();
    renderPreview(records, data);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

//render

function renderPreview(record) {
  const { description, primaryimageurl, title, url } = record;
  const recordObj = $(`<div class="object-preview">
    <a href="#"><h3>${title ? title : ""}</h3></a>
    <img src="${primaryimageurl ? primaryimageurl : ""}"/>
    <h3>${description ? description : ""}</h3>
  </a>
  </div>`);
  recordObj.data("record", record);
  return recordObj;
}

function updatePreview(records, info) {
  const root = $("#preview");
  const results = $(".results");
  if (info.next) {
    $(".next").data("url", info.next).attr("disabled", false);
  } else {
    $(".next").data("url", null).attr("disabled", true);
  }
  if (info.prev) {
    $(".previous").data("url", info.prev).attr("disabled", false);
  } else {
    $(".previous").data("url", null).attr("disabled", true);
  }
  results.empty();
  records.forEach(function (record) {
    const recordObj = renderPreview(record);
    results.append(recordObj);
  });
}

function renderFeature(record) {
  const {
    title,
    dated,
    description,
    culture,
    style,
    technique,
    medium,
    dimensions,
    people,
    department,
    division,
    contact,
    creditline,
    images,
    primaryimageurl,
  } = record;
  return $(`<div class="object-feature">
  <header>
    <h3>${title}</h3>
    <h4>${dated}</h4>
  </header>
  <section class="facts">
    ${factHTML("Description",description)}
    ${factHTML("Culture",culture, "culture")}
    ${factHTML("Style",style)}
    ${factHTML("Technique",technique, "technique")}
    ${factHTML("Medium",medium ? medium.toLowerCase() : null, "medium")}
    ${factHTML("Dimensions",dimensions)}
    ${
      people
        ? people
            .map((person) => factHTML("Person", person.displayname, "person"))
            .join("")
        : ""
    } 
    ${factHTML("Department", department)}
    ${factHTML("Division", division)}
    ${factHTML(
      "Contact",
      `<a target="_blank" href="mailto: ${contact}"> ${contact} </a>`
    )}
    ${factHTML("Credit", creditline)}
  </section>
  <section class="photos">
  ${photosHTML(images, primaryimageurl)}
  </section>
</div>`);
}

function bootStrap() {
  fetchObjects();
  prefetchCategoryLists();
}

bootStrap();
