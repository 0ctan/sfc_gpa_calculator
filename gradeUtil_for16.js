const fs   = require('fs')
const path = require('path')

const PASS = 'pass'
const FAIL = 'fail'
const EXP = 'expected'

// 標準 <http://www.gakuji.keio.ac.jp/academic/shoumei/grading_system.html>
const gradeTbl16 = {         'Ａ': 4, 'Ｂ': 3, 'Ｃ': 2, 'Ｄ': 0, '★': FAIL, 'Ｐ': PASS, 'Ｆ': FAIL, 'Ｇ': PASS, '？': EXP, '-': EXP}
const gradeTbl17 = {'Ｓ': 4, 'Ａ': 3, 'Ｂ': 2, 'Ｃ': 1, 'Ｄ': 0,            'Ｐ': PASS, 'Ｆ': FAIL, 'Ｇ': PASS, '？': EXP, '-': EXP}

// // 交換留学用 <http://www.ic.keio.ac.jp/keio_student/exchange/qualifications.html>
// const gradeTbl16 = {         'Ａ': 5,   'Ｂ': 4, 'Ｃ': 3, 'Ｄ': 0, '★': FAIL, 'Ｐ': PASS, 'Ｆ': FAIL, 'Ｇ': PASS, '？': EXP, '-': EXP}
// const gradeTbl17 = {'Ｓ': 5, 'Ａ': 4.5, 'Ｂ': 4, 'Ｃ': 3, 'Ｄ': 0,            'Ｐ': PASS, 'Ｆ': FAIL, 'Ｇ': PASS, '？': EXP, '-': EXP}

// // 奨学金用 (JASSO用成績係数) <http://www.ic.keio.ac.jp/keio_student/scholarship/2018jasso_1.2.ad.html>
// const gradeTbl16 = {         'Ａ': 3, 'Ｂ': 2, 'Ｃ': 1, 'Ｄ': 0, '★': FAIL, 'Ｐ': PASS, 'Ｆ': FAIL, 'Ｇ': PASS, '？': EXP, '-': EXP}
// const gradeTbl17 = {'Ｓ': 3, 'Ａ': 3, 'Ｂ': 2, 'Ｃ': 1, 'Ｄ': 0,            'Ｐ': PASS, 'Ｆ': FAIL, 'Ｇ': PASS, '？': EXP, '-': EXP}

const indexTbl = {
  className: 0,
  profName:  1,
  grade:     2,
  credit:    3,
  makeup:    4,
  year:      5,
  term:      6,
  when:      7,
}

;(function () {
  const argv = process.argv
  if (argv.length !== 3) {
    console.log(`usage: node ${path.basename(argv[1])} fileName`)
    return
  }
  readFile(argv[2])
    .then(read   => parseFile(read))
    .then(parsed => calcStat(parsed))
    .then(res    => formatInfo(res))
    .catch(err   => print(err))
})()

function readFile (filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  })
}

// parseFile :: String fileData -> {'header': [String header ...],
//                                  'List': {String category: [[String className ...] ...] ...}}
function parseFile (fileData) {
  return new Promise ((resolve, reject) => {
    let Parsed = {}
    let table = fileData.split('\n').map(line =>
      line.split('\t').map(e => e.trim()))
    Parsed.header = table.shift()
    Parsed.List = {}

    let category = ''
    table.forEach(row => {
      if (row.length === 2) {
        category = row[0].slice(12)
        Parsed.List[category] = []
      } else if (row.length === 8) {
        Parsed.List[category].push(row)
      }
    })
    resolve(Parsed)
  })
}

// calcStat :: Object Parsed -> +{'Stat': {sum_credit ...},
//                                'List': {'Stat': {Number credit, Number grade ...} ...}
function calcStat (Parsed) {
  Parsed.Stat = {}
  let Cat     = {}
  let Type    = {}

  let sum_credit       = 0
  let sum_grade        = 0
  let sum_failed       = 0
  let sum_pending      = 0
  let sum_creditExtra  = 0
  let sum_gradeExtra   = 0
  let sum_failedExtra  = 0
  let sum_pendingExtra = 0
  let sum_deduct       = 0 // deduct PASS/FAIL credits from GPA calculation

  Object.keys(Parsed.List).forEach(category => {
    let credit  = 0
    let grade   = 0
    let failed  = 0
    let pending = 0
    let deduct  = 0

    Parsed.List[category].forEach(row => {
      let gradeTbl = (Number(row[indexTbl.year]) < 2017) ? gradeTbl16 : gradeTbl17

      let c = Number(row[indexTbl.credit])
      let g = gradeTbl[row[indexTbl.grade]]
      switch (g) {
        case PASS: credit += c
                   deduct += c; break
        case FAIL: failed += c
                   deduct += c; break
        case EXP: pending += c; break
        default:
          grade += g * c
          if (g === 0) failed += c
          else         credit += c
      }
    })

    // 自由科目の単位は卒業単位には含まれない
    if (category.includes('自由科目')) {
      sum_creditExtra  += credit
      sum_gradeExtra   += grade
      sum_failedExtra  += failed
      sum_pendingExtra += pending
    } else {
      sum_credit  += credit
      sum_grade   += grade
      sum_failed  += failed
      sum_pending += pending
      sum_deduct  += deduct
    }

    Cat[category] = {
      credit,
      grade,
      failed,
      pending,
      gpa: grade / (credit + failed - deduct),
    }
  })

  Type = gatherType(Cat)

  Parsed.Stat = {
    sum_credit,
    sum_grade,
    sum_failed,
    sum_pending,
    sum_creditExtra,
    sum_gradeExtra,
    sum_failedExtra,
    sum_pendingExtra,

    // 16年以前の入学者は成績表にDは記載されないため、落とした科目はGPA計算に含まない
    sum_creditWithExtra: sum_credit + sum_creditExtra,
    gpa: sum_grade / (sum_credit /* + sum_failed*/ - sum_deduct),
    gpaWithExtra: (sum_grade + sum_gradeExtra) / (sum_credit /*+ sum_failed */ + sum_creditExtra /*+ sum_failedExtra*/ - sum_deduct),
    Type,
    Cat,
  }

  return Parsed
}

// gatherType :: Object Categories -> {String type: {joinedStat} ...}
function gatherType (Cat) {
  Type = {}
  Object.keys(Cat).forEach(category => {
    let prefix = category.split(' ')[0]
    if (Type[prefix]) Type[prefix] = joinObj(Type[prefix], Cat[category])
    else              Type[prefix] = Cat[category]
  })
  Object.keys(Type).forEach(t => {
    Type[t].gpa = Type[t].grade / Type[t].credit
  })
  return Type
}

function joinObj (A, B) {
  R = {}
  Object.keys(A).forEach(keyA => {
    Object.keys(B).forEach(keyB => {
      if (keyA === keyB)
        R[keyA] = A[keyA] + B[keyB]
    })
  })
  return R
}

// formatInfo :: Object Record -> IO
function formatInfo (Record) {
  // http://www.gakuji.keio.ac.jp/sfc/pe/3946mc0000022u8x-att/3946mc0000022vc8.pdf
  const req_senior_basic      = 30
  const req_graduate_advanced = 30
  const req_graduate_total    = 124

  let S = Record.Stat
  info = `現在の取得単位: ${S.sum_credit}
落とした単位: ${S.sum_failed}
GPA: ${S.gpa.toFixed(2)}
取得予定の単位: ${S.sum_pending}

--------------------------
4年進級条件:
  基盤科目: ${S.Type['基盤科目'] ?
      S.Type['基盤科目'].credit : 0}/${req_senior_basic}
  体育2・3: ${S.Cat['基盤科目 ウェルネス科目 体育２・３'] ?
      S.Cat['基盤科目 ウェルネス科目 体育２・３'].credit : 0}/2
  研究会: ${S.Cat['研究プロジェクト科目 研究会'] ?
      S.Cat['研究プロジェクト科目 研究会'].credit : 0}/2

卒業条件:
  先端科目: ${S.Type['先端科目'] ?
      S.Type['先端科目'].credit : 0}/${req_graduate_advanced}
  合計: ${S.sum_credit}/${req_graduate_total} ${(S.sum_credit < req_graduate_total) ?
      ['(あと', req_graduate_total - S.sum_credit, '単位)'].join('') : ''}

--------------------------
自由科目の情報:
  取得単位: ${S.sum_creditExtra} (合計${S.sum_creditWithExtra})
  落とした単位: ${S.sum_failedExtra}
  自由科目込みのGPA: ${S.gpaWithExtra.toFixed(2)}
  取得予定の単位: ${S.sum_pendingExtra}
`

  console.log(info)
}

function print (data) {
  console.log(JSON.stringify(data, null, 4))
}
