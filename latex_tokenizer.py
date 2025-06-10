import re
import json
from typing import List
import execjs
from tqdm import tqdm
from datasets import Dataset

class LatexTokenizer:
    def __init__(self, path):
        self.special_tokens = {"<pad>": 0, "<unk>": 1, "<sos>": 2, "<eos>": 3, "<mask>": 4}
        self.align = re.compile(r'\\begin{align\*}(.*?)\\end{align\*}')
        self.cases = re.compile(r'\\begin{(rcases|dcases|cases\*)}(.*?)\\end{(rcases|dcases|cases\*)}')
        self.comment = re.compile(r'(?<!\\)%')
        self.gt_space = re.compile(r'(?<!\\)\\>')
        self.hskip = re.compile(r'hskip(.*?)(cm|in|pt|mm|em)')
        self.label = re.compile(r'\\label(\[[^\]]*\])?\{([^}]*)\}')
        with open(path,'r') as f:
            self.ctx = execjs.get('Node').compile(f.read())
            
    def load_vocab(self, file):
        self.vocab_size = 658
        with open(file, 'r') as f:
            self.vocab = json.loads(f.read())
        self.inverse_vocab = {v: k for k, v in self.vocab.items()}
    
    def build_vocab(self, formulas):
        """Build vocabulary from training texts"""
        with open('token-counts.json', 'w') as f:
            f.write('{}')
        batch = []
        for i, formula in enumerate(tqdm(formulas)):
            if i != 0 and i % 5000 == 0:
                batch.append(self._clean_formula(formula))
                self.ctx.call("expandVocabularyBatch", batch)
                batch = []
            else:
                batch.append(self._clean_formula(formula))
        if len(batch) > 0:
            self.ctx.call("expandVocabularyBatch", batch)
        self.ctx.call('generateVocabulary')
        self.load_vocab('vocabulary.json')
        
    def _clean_formula(self, formula):
        formula = self.align.sub(r'\\begin{aligned}\1\\end{aligned}', formula)
        formula = self.comment.split(formula)[0]
        formula = formula.strip()
        formula = self.gt_space.sub('\\:', formula)
        formula = self.hskip.sub(r'hspace{\1\2}', formula)
        formula = self.label.sub('', formula)
        formula = formula.replace("‐", '-')
        formula = formula.replace("–", '-')
        formula = formula.replace("’", "'")
        return formula
    
    def convert_tokens_to_ids(self, tokens: List[str]) -> List[int]:
        """Convert tokens to their corresponding IDs"""
        return [self.vocab.get(token, self.special_tokens['<unk>']) for token in tokens]
    
    def convert_ids_to_tokens(self, ids: List[int]) -> List[str]:
        """Convert IDs back to tokens"""
        return [self.inverse_vocab.get(id, '<unk>') for id in ids]
    
    def decode(self, token_ids: List[int]) -> str:
        """Decode token IDs back to text"""
        tokens = self.convert_ids_to_tokens(token_ids)
        tokens = [token for token in tokens if token not in self.special_tokens]
        return ' '.join(tokens)
    
    def validate_formulas(self, batch):
        formulas = batch['latex_formula']
        return self.ctx.call("validateFormulas", [self._clean_formula(f) for f in formulas])
    
    def filter_dataset(self, dataset:Dataset):
        return dataset.filter(self.validate_formulas, batched=True, batch_size=5000)
    
    def split_formulas(self, formulas: list[str]) -> list[list[str]]:
        return self.ctx.call("splitFormulas", [self._clean_formula(f) for f in formulas])
    
    def encode_batch(self, batch):
        """
        Encode text to token IDs with optional padding/truncation
        Returns dict with 'input_ids' and 'attention_mask'
        """
        batch = batch['latex_formula']
        
        tokens = []
        for split in self.split_formulas(batch):
            t = [self.special_tokens['<sos>']]+self.convert_tokens_to_ids(split)+[self.special_tokens['<eos>']]
            tokens.append(t)
        
        batch_encoding = {
            'input_ids': [],
            'attention_mask': []
        }
        
        for sequence in tokens:
            batch_encoding['input_ids'].append(sequence)
            batch_encoding['attention_mask'].append([1]*len(sequence))
        
        return batch_encoding
    
