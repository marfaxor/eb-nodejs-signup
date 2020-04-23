from django import forms

class TelForm(forms.Form):
    phone_number = forms.CharField(label='Phone Number', max_length=12)
    content = forms.CharField(label='Content', max_length=100)

class SurveyForm(forms.Form):
    phone_number = forms.CharField(label='Phone Number', max_length=12)
    question = forms.CharField(label='Question to ask', max_length=100)