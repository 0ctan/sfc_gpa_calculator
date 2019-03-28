# sfc_gpa_calculator
## about
SFC生用のGPA計算ツールです。進級要件や、卒業要件までの差分も表示されます。
もとは同じ研究室の[gentam](https://github.com/gentam)さんのコードですが、16年以前の入学者は不合格科目が成績証明書に記載されないため、GPAの計算上も不合格科目は除外されるように改変しました。

## How to use
**このプログラムの実行にはnodeが必要です**
1. SFS > 学事Webシステム > 学業成績表を表示
2. 表の部分だけを選択してコピー(「科目名称」〜「以上」まで含めてコピー)
3. スクリプトと同階層にある`record.txt`にそのままペースト
4. 実行  
16年以前の入学者用`$ node gradeUtil_for16s.js record.txt`  
17年以降の入学者用`$ node gradeUtil_after17.js record.txt`

## License
- コピーライト: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- ソース元: [grade-util](https://gent.am/grade-util.html)
- 元の作成者: [gentam](https://github.com/gentam)
