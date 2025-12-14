<template>
  <div id="gridDiv">
<!--    <div class="button">-->
<!--      <button @click="gridApi?.undoCellEditing()">undo</button>-->
<!--      <button @click="gridApi?.redoCellEditing()">redo</button>-->
<!--      <button @click="update">update</button>-->
<!--    </div>-->
    <div style="height: 100%; overflow: auto">

      <AgGridVue
          style="width: 100%; height: 100%"
          :columnDefs="columnDefs"
          :rowData="rowData"
          @grid-ready="onGridReady"
          :class="gridThemeClass"
          :gridOptions="gridOptions"
          @row-clicked="onRowClicked"
      />
    </div>
    <!-- <div class="button">
      <button @click="onAddRow">추가</button>
      <button @click="onRemoveSelected">삭제</button>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { useQuasar } from 'quasar'

import type { GridReadyEvent } from 'ag-grid-community'
import type { ColumnApi } from 'ag-grid-community/dist/lib/columns/columnApi'
import type { GridOptions,
  GridApi,
  ColDef,
  SizeColumnsToContentStrategy,
  SizeColumnsToFitGridStrategy,
  SizeColumnsToFitProvidedWidthStrategy
} from 'ag-grid-community'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

const gridApi = ref<GridApi | null>(null)
const columnApi = ref<ColumnApi | null>(null)

const columnDefs = defineModel('columnDefs')
const rowData = defineModel('rowData')
const emits = defineEmits(['onCellClicked', 'rowClicked'])

const $q = useQuasar()

const autoSizeStrategy = ref<
    | SizeColumnsToFitGridStrategy
    | SizeColumnsToFitProvidedWidthStrategy
    | SizeColumnsToContentStrategy
>({
  type: "fitGridWidth",
  defaultMinWidth: 100,
  columnLimits: [
    {
      colId: "country",
      minWidth: 900,
    },
  ],
});

const gridOptions: GridOptions = {
  columnDefs: columnDefs,
  // enableCharts: false, // chart 노출
  rowSelection: 'multiple', // row selection
  undoRedoCellEditing: true, // undo 가능
  undoRedoCellEditingLimit: 10, // 최대 undo 횟수
  stopEditingWhenCellsLoseFocus: true, // focus 잃었을때 갱신
  domLayout: 'autoHeight', // height 자동조정
  rowHeight: 45, // 행 높이
  autoSizeStrategy: autoSizeStrategy,
  defaultColDef: {
    editable: true, // 셀 수정 가능
    filter: true, // filter 가능
    flex: 1,
    minWidth: 100,
    resizable: true,
    sortable: true,
    cellStyle: {
      display: 'flex',
      alignItems: 'center'
    }
  },
  // 사이드,바
  // sideBar: {
  //   toolPanels: ['columns', 'filters'],
  //   defaultToolPanel: ''
  // },
  processDataFromClipboard: autoAddRows
}

function onGridReady(params) {
  //그리드 준비완료 이벤트'
  gridApi.value = params.api
  columnApi.value = params.columnApi

  // gridApi.value?.setRowData(rowData)
  gridApi.value?.sizeColumnsToFit()
}


function getAllNode() {
  let rowData = []
  gridApi.value?.forEachNode((node) => rowData.push(node.data))
  return rowData
}
function update() {
  // action에 의한 api 전송 시 그리드 전체 데이터 가져오기
  console.log(getAllNode())
}
function onCellClicked(params) {
  // 셀 클릭 이벤트
  console.log('cell click : ', params)
  emits('onCellClicked', params)
}
function clearSelectedNode() {
  // 범위 지정된(선택된) 셀 clear
  // gridApi.value?.clearRangeSelection()
  // gridApi.value?.clearFocusedCell()
}
// function onAddRow() {
//   // row추가
//   const newItem = [{ SB: 0, BB: 0, Ante: 0 }]
//   gridApi.value?.applyTransaction({ add: newItem })
//   clearSelectedNode()
// }
// function onRemoveSelected() {
//   // row 삭제
//   const id = gridApi.value?.getFocusedCell() //focus된 셀 가져오기
//   console.log(id)
//   let rows = getAllNode()
//   if (rows.length == 1) return
//   if (id) {
//     // 선택된 셀이 있으면 그 셀이 포함된 row 삭제
//     rows.splice(id.rowIndex, 1)
//   } else {
//     // 아닌경우 마지막 셀 삭제
//     rows.splice(rows.length - 1, 1)
//   }
//   gridApi.value?.setRowData(rows) // set row data
//   gridApi.value?.sizeColumnsToFit() //width 폭 맞춤
//   clearSelectedNode()
// }

function autoAddRows(params) {
  const emptyLastRow =
      params.data[params.data.length - 1][0] === '' &&
      params.data[params.data.length - 1].length === 1

  if (emptyLastRow) {
    params.data.splice(params.data.length - 1, 1)
  }

  const lastIndex = gridApi.value?.getModel().rowsToDisplay.length - 1
  const focusedCell = gridApi.value?.getFocusedCell()
  const focusedIndex = focusedCell.rowIndex

  if (focusedIndex + params.data.length - 1 > lastIndex) {
    const resultLastIndex = focusedIndex + (params.data.length - 1)
    const addRowCount = resultLastIndex - lastIndex
    console.log(addRowCount)
    let rowsToAdd = []
    let addedRows = 0
    let currIndex = params.data.length - 1
    while (addedRows < addRowCount) {
      rowsToAdd.push(params.data.splice(currIndex, 1)[0])
      addedRows++
      currIndex--
    }
    rowsToAdd = rowsToAdd.reverse()
    let newRowData = []
    rowsToAdd.map((r) => {
      console.log(r)
      let row = {}
      let currColumn = focusedCell.column
      r.map((i) => {
        if (currColumn.hasOwnProperty('colDef')) {
          row[currColumn.colDef.field] = i
          currColumn = columnApi.value?.getDisplayedColAfter(currColumn)
        }
      })
      newRowData.push(row)
    })
    console.log(newRowData)
    gridApi.value?.applyTransaction({ add: newRowData })
  }
  return params.data
}

function onRowClicked(params) {
  emits('rowClicked', params)
}

// Add computed property for grid theme class
const gridThemeClass = computed(() => 
  $q.dark.isActive ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'
)

onMounted(() => {
  const body = document.body
  body.addEventListener('mouseup', function (e: Event) {
    // out focus event
    // let gridDiv = document.querySelector('#gridDiv')
    // if (!gridDiv.contains(e.target as HTMLDivElement)) {
    //   //grid 외부 선택시
    //   clearSelectedNode()
    // }
  })
})
</script>
<style scoped lang="scss">
.button {
  text-align: end;
  button {
    width: 100px;
    height: 40px;
  }
}
</style>
