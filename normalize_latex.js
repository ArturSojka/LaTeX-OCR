// Modified version of https://github.com/harvardnlp/im2markup/blob/master/scripts/preprocessing/preprocess_latex.js

var katex = require("./third_party/katex/katex.js");
var options = require("./third_party/katex/src/Options.js");
var fs = require('fs');

var remove_tokens = ['\\vskip', '\\lower', '…', 'ù', '\\negmedspace', 'cm', 'mm', '\\rule', '\\blacktriangleright', '\\underrightarrow', '\\hrule', '\\hfil', '\\swarrow', '\\sqsupset', '\\joinrel', '\\rightharpoondown', '\\~', '\\barwedge', '\\Ddot', '\\dotso', '\\Supset', '\\backepsilon', '\\normalfont', '\\twoheadleftarrow', '\\index', '\\stepcounter', '\\clubsuit', '\\iffalse', '\\precneqq', '\\lq', '\\gtreqqless', '\\linethickness', '\\mathnormal', '\\blacksquare', '\\smallsmile', '\\fi', '\\bgroup', 'â€™', '\\checkmark', '\\hss', '\\Cup', '\\mathchar', '\\varsubsetneq', '\\right(', '1.7', '\\do', '\\skew', '\\coloneq', '\\left\\updownarrow', '\\rightarrowfill', '\\Bigm', '\\mathstrut', '\\tabcolsep', '\\ddddot', '\\Biggm', '\\vadjust', '0.4', '\\xhookrightarrow', '\\left]', '\\textsubscript', '\\risingdotseq', '\\ddag', '\\urcorner', '\\noindent', '\\ulcorner', '\\medmuskip', '\\sqsubseteq', '\\shortmid', '\\idotsint', '\\footnotemark', '\\r', '\\splitfrac', '\\dashleftarrow', '0.3', '\\curvearrowright', '\\varUpsilon', '\\label', '\\setcounter', '\\diagup', '\\above', '\\rightleftharpoons', '\\varpropto', '\\doteqdot', '\\vartriangleright', '\\goodbreak', '1.5', '\\bigodot', '\\%', '\\rightleftarrows', '\\owns', '\\selectfont', '\\looparrowleft', '\\nprec', '\\nrightarrow', '\\gtrdot', '\\unboldmath', '\\iiiint', '\\lvertneqq', '\\Ref', '\\right[', '\\overleftrightarrow', '0.1', '\\scshape', '\\span', '\\looparrowright', '\\dotsi', '\\right\\rbrack', '\\$', '\\refstepcounter', '\\rightarrowtail', '\\@', '\\Join', '\\fboxsep', '\\atopwithdelims', '\\veebar', '\\leftharpoonup', '\\textcircled', '\\limits', '\\endgroup', '\\xlongrightarrow', '\\underbracket', '\\reflectbox', '\\blacktriangle', '\\providecommand', '\\dotfill', '\\eqno', '\\unitlength', '\\operatornamewithlimits', '\\Huge', '\\lneq', '\\downharpoonright', '\\"', '\\fontsize', '\\leftthreetimes', '\\nparallel', '\\adjustlimits', '\\npreceq', 'Ăą', '\\right\\lvert', '\\lll', '\\centering', '\\overwithdelims', '\\spadesuit', '\\mathaccent', '16', 'pt', '\\bowtie', '\\textless', '\\measuredangle', '\\shortvdotswithin', '\\rgroup', '\\endline', '\\supsetneqq', '\\ointop', '\\newline', '\\special', '\\arabic', '\\Leftarrow', '\\smashoperator', '\\left>', '\\gneq', '\\postdisplaypenalty', '\\thickapprox', '2.1', '\\diagdown', '\\pod', '\\preccurlyeq', '\\varTheta', '\\right\\updownarrow', '\\vartriangleleft', '\\thicklines', '\\displaylimits', '\\lessgtr', '\\hookleftarrow', '\\makeatletter', '\\varsubsetneqq', '\\theparentequation', '\\downharpoonleft', '\\fill', '\\nsupseteq', '\\precsim', '\\parbox', '\\eject', '\\copyright', '\\thinmuskip', '10', '\\huge', '\\temp', '\\fam', '\\break', '\\negthinspace', '\\divideontimes', '\\thickspace', '\\boxminus', '\\lgroup', '\\therefore', 'â€“', '\\boxdot', '\\gtrless', '\\norm', '\\right<', "\\'", '\\dasharrow', '\\framebox', '\\curlywedge', '\\vss', '\\nolimits', '\\rightskip', '\\advance', '\\nexists', '\\normalcolor', '\\left\\lbrack', '\\centerline', '\\mskip', '#', '\\overunderset', '\\negthickspace', '\\v', '\\raisetag', '\\overbracket', '3.1', '\\veqno', '\\newcommand', '0.14', '\\vcenter', '\\curvearrowleft', '\\hdotsfor', '\\leftrightharpoons', '\\upharpoonleft', '\\projlim', '\\textendash', '\\leftrightsquigarrow', '\\everymath', '\\f', '\\offinterlineskip', '\\backsim', '\\fallingdotseq', '\\nolinebreak', '\\gimel', '\\gdef', '\\textgreater', '\\vector', '\\leftrightarrows', '\\begingroup', '\\circeq', '\\numberwithin', '\\Arrowvert', '\\nleq', '\\Longleftarrow', '\\vdotswithin', '\\displaybreak', '\\egroup', '\\textasteriskcentered', '\\dotplus', '0.9', '\\bigtimes', '0.5', '\\linewidth', 'â€¦', '\\ncong', '\\blacktriangledown', '\\thickmuskip', '\\oval', '\\backprime', '\\textfractionsolidus', '\\varXi', '\\dashrightarrow', '\\crcr', '\\xmapsto', '\\nwarrow', '\\`', '8.5', '\\leavevmode', '\\multiput', '\\lessdot', '\\circleddash', '\\indent', '\\precapprox', '\\lessapprox', '\\underleftarrow', '\\leftharpoondown', '\\ooalign', '\\let', '3.2', '\\LARGE', '\\symbol']

function expandVocabularyBatch(batch) {
    fs.readFile('token-counts.json', 'utf8', function (err, data) {
        if (err) throw err;
        
        var vocab = JSON.parse(data);
        for(let i = 0; i < batch.length; i++) {
            vocab = expandVocabulary(batch[i], vocab);
        }
        fs.writeFile('token-counts.json', JSON.stringify(vocab), (err) => { if (err) throw err; });
    });
}

function expandVocabulary(formula, vocab) {
    if (formula.includes('renewcommand')) {
        return vocab;
    }
    try {
        var normalized = normalizeLatex(formula);
    } catch (e) {
        return vocab;
    }

    for(var i = 0; i < remove_tokens.length; i++){
        if (normalized.includes(' '+remove_tokens[i]+' ')){
            return vocab;
        }
    }

    normalized = normalized.replace(' \\  ',' __BS_TOKEN__ ');
    for(token of normalized.split(/\s+/)){
        if (token == '') continue;
        if (token in vocab) {
            vocab[token] += 1
        } else {
            vocab[token] = 1
        }
    }
    return vocab;
}

function generateVocabulary() {
    fs.readFile('token-counts.json',function (err, data) {
        if (err) throw err;
        
        var counts = JSON.parse(data);
        counts['\\ '] = counts['__BS_TOKEN__'];
        delete counts['__BS_TOKEN__'];
        fs.writeFile('token-counts.json', JSON.stringify(counts, null, 2), (err) => { if (err) throw err; })
        const tokens = {
            "<pad>": 0,
            "<unk>": 1,
            "<sos>": 2,
            "<eos>": 3,
            "<mask>": 4,
        };
        const sortedCounts = Object.entries(counts).sort(([, countA], [, countB]) => countB - countA);

        sortedCounts.forEach(([key, value], i) => {
            tokens[key] = i + 5;
        });
        fs.writeFile('vocabulary.json', JSON.stringify(tokens, null, 2), (err) => { if (err) throw err; })
    });
}

function validateFormulas(formulas) {
    var results = new Array(formulas.length);
    
    for (let i = 0; i < formulas.length; i++) {
        var formula = formulas[i];
        results[i] = true;
        if (formula.includes('renewcommand')) {
            results[i] = false;
            continue;
        }
        try {
            var normalized = normalizeLatex(formula);
        } catch (e) {
            results[i] = false;
            continue;
        }
        for(let j = 0; j < remove_tokens.length; j++){
            if (normalized.includes(' '+remove_tokens[j]+' ')){
                results[i] = false;
                break;
            }
        }
    }
    return results
}

function normalizeLatex(inputLine) {
    norm_str = "";
    global_str = "";
    
    var line = inputLine;
    
    line = line + " ";
    
    try {
        var tree = katex.__parse(line, {});
        buildExpression(tree, new options({}));
        return norm_str
    } catch (e) {
        throw new Error("Error processing LaTeX: " + e + "\n" + e.stack + " for input: " + line);
    }
}

function normalizeBatch(batch) {
    var results = new Array(batch.length);
    
    for (var i = 0; i < batch.length; i++) {
        try {
            results[i] = normalizeLatex(batch[i]);
        } catch (e) {
            results[i] = '';
        }
    }
    return results;
}

function splitFormulas(formulas) {
    var results = new Array(formulas.length);

    for (var i = 0; i < formulas.length; i++) {
        var tokens = new Array();
        var normalized = normalizeLatex(formulas[i]);
        normalized = normalized.replace(' \\  ',' __BS_TOKEN__ ');
        for(token of normalized.split(/\s+/)){
            if (token == '') continue;
            if (token == '__BS_TOKEN__') {
                tokens.push('\\ ');
            } else {
                tokens.push(token);
            }
        }
        results[i] = tokens;
    }
    return results;
}

function str(s) {
    if (typeof s === 'string' || s instanceof String || typeof s === 'number') {
        return s;
    }
    if (s instanceof Array) {
        throw new TypeError("Got an Array, expected string: " + s);
    }
    throw new TypeError("Not a string: " + JSON.stringify(s));
}

var groupTypes = {};

groupTypes.mathord = function(group, options) {
    if (options.font == "mathrm"){
        for (i = 0; i < group.value.length; ++i ) {
            if (group.value[i] == " ") {
                norm_str = norm_str + str(group.value[i]) + "\; ";
            } else {
                norm_str = norm_str + str(group.value[i]) + " ";
            }
        }
    } else {
        norm_str = norm_str + str(group.value) + " ";
    }
};

groupTypes.textord = function(group, options) {
    norm_str = norm_str + str(group.value) + " ";
};

groupTypes.bin = function(group) {
    norm_str = norm_str + str(group.value) + " ";
};

groupTypes.rel = function(group) {
    norm_str = norm_str + str(group.value) + " ";
};

groupTypes.open = function(group) {
    norm_str = norm_str + str(group.value) + " ";
};

groupTypes.close = function(group) {
    norm_str = norm_str + str(group.value) + " ";
};

groupTypes.inner = function(group) {
    norm_str = norm_str + str(group.value) + " ";
};

groupTypes.punct = function(group) {
    norm_str = norm_str + str(group.value) + " ";
};

groupTypes.ordgroup = function(group, options) {
    norm_str = norm_str + "{ ";

    buildExpression(group.value, options);

    norm_str = norm_str +  "} ";
};

groupTypes.text = function(group, options) {
    
    norm_str = norm_str + "\\mathrm { ";

    buildExpression(group.value.body, options);
    norm_str = norm_str + "} ";
};

groupTypes.color = function(group, options) {
    var inner = buildExpression(group.value.value, options);

    var node = new mathMLTree.MathNode("mstyle", inner);

    node.setAttribute("mathcolor", group.value.color);

    return node;
};

groupTypes.supsub = function(group, options) {
    buildGroup(group.value.base, options);

    if (group.value.sub) {
        norm_str = norm_str + "_ ";
        if (group.value.sub.type != 'ordgroup') {
            norm_str = norm_str + " { ";
            buildGroup(group.value.sub, options);
            norm_str = norm_str + "} ";
        } else {
            buildGroup(group.value.sub, options);
        }
        
    }

    if (group.value.sup) {
        norm_str = norm_str + "^ ";
        if (group.value.sup.type != 'ordgroup') {
            norm_str = norm_str + " { ";
            buildGroup(group.value.sup, options);
            norm_str = norm_str + "} ";
        } else {
            buildGroup(group.value.sup, options);
        }
    }

};

groupTypes.genfrac = function(group, options) {
    if (!group.value.hasBarLine) {
        norm_str = norm_str + "\\binom ";
    } else {
        norm_str = norm_str + "\\frac ";
    }
    buildGroup(group.value.numer, options);
    buildGroup(group.value.denom, options);

};

groupTypes.array = function(group, options) {
    norm_str = norm_str + "\\begin{" + str(group.value.style) + "} ";

    if (group.value.style == "array" || group.value.style == "tabular") {
        norm_str = norm_str + "{ ";
        if (group.value.cols) {
            group.value.cols.map(function(start) {
                if (start) {
                    if (start.type == "align") {
                        norm_str = norm_str + str(start.align) + " ";
                    } else if (start.type == "separator") {
                        norm_str = norm_str + str(start.separator) + " ";
                    }
                }
            });
        } else {
            group.value.body[0].map(function(start) {
                norm_str = norm_str + "c ";
            } );
        }
        norm_str = norm_str + "} ";
    }
    group.value.body.map(function(row) {
        if (row.length > 1 || row[0].value.length > 0) {
            if (row[0].value[0] && row[0].value[0].value == "\\hline") {
                norm_str = norm_str + "\\hline ";
                row[0].value = row[0].value.slice(1);
            }
            out = row.map(function(cell) {
                buildGroup(cell, options);
                norm_str = norm_str + "& ";
            });
            norm_str = norm_str.substring(0, norm_str.length-2) + "\\\\ ";
        }
    }); 
    norm_str = norm_str + "\\end{" + str(group.value.style) + "} ";
};

groupTypes.sqrt = function(group, options) {
    var node;
    if (group.value.index) {
        norm_str = norm_str + "\\sqrt [ ";
        buildGroup(group.value.index, options);
        norm_str = norm_str + " ] ";
        buildGroup(group.value.body, options);
    } else {
        norm_str = norm_str + "\\sqrt ";
        buildGroup(group.value.body, options);
    }
};

groupTypes.leftright = function(group, options) {

    norm_str = norm_str + "\\left" + str(group.value.left) + " ";
    buildExpression(group.value.body, options);
    norm_str = norm_str + "\\right" + str(group.value.right) + " ";
};

groupTypes.accent = function(group, options) {
    if (group.value.base.type != 'ordgroup') {
        norm_str = norm_str + str(group.value.accent) + " { ";
        buildGroup(group.value.base, options);
        norm_str = norm_str + "} ";
    } else {
        norm_str = norm_str + str(group.value.accent) + " ";
        buildGroup(group.value.base, options);
    }
};

groupTypes.spacing = function(group) {
    var node;
    if (group.value == " ") {
        norm_str = norm_str + "~ ";
    } else {
        norm_str = norm_str + str(group.value) + " ";
    }
    return node;
};

groupTypes.op = function(group) {
    var node;
    
    if (group.value.symbol) {
        // This is a symbol. Just add the symbol.
        norm_str = norm_str + str(group.value.body) + " ";

    } else {
        if (group.value.limits == false) {
            norm_str = norm_str + "\\\operatorname { ";
        } else {
            norm_str = norm_str + "\\\operatorname* { ";
        }
        for (i = 1; i < group.value.body.length; ++i ) {
            norm_str = norm_str + str(group.value.body[i]) + " ";
        }
        norm_str = norm_str + "} ";
    }
};

groupTypes.katex = function(group) {
    var node = new mathMLTree.MathNode(
        "mtext", [new mathMLTree.TextNode("KaTeX")]);

    return node;
};

groupTypes.font = function(group, options) {
    var font = group.value.font;
    if (font == "mbox" || font == "hbox") {
        font = "mathrm";
    }
    norm_str = norm_str + "\\" + str(font) + " ";
    
    buildGroup(group.value.body, options.withFont(font));
        
};

groupTypes.delimsizing = function(group) {
    var children = [];
    norm_str = norm_str + str(group.value.funcName) + " " + str(group.value.value) + " ";
};

groupTypes.styling = function(group, options) {
    norm_str = norm_str + " " + str(group.value.original) + " ";
    buildExpression(group.value.value, options);

};

groupTypes.sizing = function(group, options) {

    if (group.value.original == "\\rm") {
        norm_str = norm_str + "\\mathrm { "; 
        buildExpression(group.value.value, options.withFont("mathrm"));
        norm_str = norm_str + "} ";
    } else {
        norm_str = norm_str + " " + str(group.value.original) + " ";
        buildExpression(group.value.value, options);
    }
};

groupTypes.overline = function(group, options) {
    norm_str = norm_str + "\\overline { ";
    
    buildGroup(group.value.body, options);
    norm_str = norm_str + "} ";
    norm_str = norm_str;

};

groupTypes.underline = function(group, options) {
    norm_str = norm_str + "\\underline { ";
    buildGroup(group.value.body, options);
    norm_str = norm_str + "} ";

    norm_str = norm_str;

};

groupTypes.rule = function(group) {
    norm_str = norm_str + "\\rule { "+str(group.value.width.number)+" "+str(group.value.width.unit)+"  } { "+str(group.value.height.number)+" "+str(group.value.height.unit)+ " } ";

};

groupTypes.llap = function(group, options) {
    norm_str = norm_str + "\\llap ";
    buildGroup(group.value.body, options);
};

groupTypes.rlap = function(group, options) {
    norm_str = norm_str + "\\rlap ";
    buildGroup(group.value.body, options);

};

groupTypes.phantom = function(group, options, prev) {
    norm_str = norm_str + "\\phantom { ";
    buildExpression(group.value.value, options);
    norm_str = norm_str + "} ";

};

var buildExpression = function(expression, options) {
    var groups = [];
    for (var i = 0; i < expression.length; i++) {
        var group = expression[i];
        buildGroup(group, options);
    }
};

var buildGroup = function(group, options) {
    if (groupTypes[group.type]) {
        groupTypes[group.type](group, options);
    } else {
        throw new ParseError(
            "Got group of unknown type: '" + group.type + "'");
    }
};