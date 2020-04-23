from django.shortcuts import render
from django.http import HttpResponse
from django.http import HttpResponseRedirect

from .models import Greeting
from .forms import TelForm, SurveyForm

import requests
import os

TILL_URL = os.environ.get("TILL_URL")

# Create your views here.
def index(request):
    
    return render(request, "index.html")


def teapot(request):
    # return HttpResponse('Hello from Python!')
    r = requests.get('http://httpbin.org/status/418')
    #print(r.text)
    return HttpResponse('<pre>' + r.text + '</pre>')

def db(request):

    greeting = Greeting()
    greeting.save()

    greetings = Greeting.objects.all()

    return render(request, 'db.html', {"greetings": greetings})



def send_text(request):

    if request.method == 'POST':
        form = TelForm(request.POST)
        #check whether its valid
        if form.is_valid():
            #process data here, write this as a seperate function when it works right
            tel = form.cleaned_data['phone_number']
            message = form.cleaned_data['content']
            #send message
            requests.post(TILL_URL, json={
                "phone": [tel],
                "text" : message
            })
            #...
            return HttpResponse('<pre>Message sent</pre>')
    #if GET or any non-POST
    else: 
        #return blank form
        form = TelForm()

    return render(request, 'sendtext.html', {'form': form} )

    
    
def send_question(request):
    if request.method == 'POST':
        form = SurveyForm(request.POST)
        #validate
        if form.is_valid():
            tel = form.cleaned_data['phone_number']
            question = form.cleaned_data['question']
            #generate json in seperate function?
            requests.post(TILL_URL, json={
                "phone": [tel],
                "questions": [{
                    "text": question,
                    "tag": "question",
                    "responses": ["Yes", "No"],
                    "webhook": "https://peaceful-everglades-39075.herokuapp.com/results/"
                }],
                "conclusion": "Thank you for your participation"
            })
            return HttpResponse("<pre>Question: '" +  question +"' sent to '" + tel + "'</pre>")
    else:
        form = SurveyForm()
    
    return render(request, 'ask.html', {'form': form} )